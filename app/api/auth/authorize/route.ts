import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { USER_ROLES } from '@/lib/auth-config'
import { generateAuthToken } from '@/lib/jwt'
import { validateUserId, sanitizeString } from '@/lib/validation'

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { requestedSite, redirectUrl } = body

    if (!requestedSite || !redirectUrl) {
      return NextResponse.json({ 
        error: 'Missing required parameters: requestedSite and redirectUrl' 
      }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedSite = sanitizeString(requestedSite)
    const sanitizedRedirectUrl = sanitizeString(redirectUrl)

    // Validate redirect URL format
    try {
      new URL(sanitizedRedirectUrl)
    } catch {
      return NextResponse.json({ 
        error: 'Invalid redirect URL format' 
      }, { status: 400 })
    }

    // Get user data from Clerk
    const user = await clerkClient.users.getUser(userId)
    const userRole = (user.publicMetadata?.role as string) || USER_ROLES.GUEST
    const userSiteAccess = (user.publicMetadata?.siteAccess as string[]) || []

    // Universal access check - works for ANY application
    const hasAccess = checkUniversalSiteAccess(sanitizedSite, userRole, userSiteAccess, sanitizedRedirectUrl)

    if (!hasAccess) {
      // Log unauthorized access attempt with site details
      console.log(`SECURITY: Access denied for ${user.emailAddresses[0]?.emailAddress} (${userId}) to site: ${sanitizedSite} (${sanitizedRedirectUrl})`)
      
      return NextResponse.json({ 
        authorized: false, 
        error: `Access denied for application "${sanitizedSite}"`,
        siteName: sanitizedSite,
        requiredPermissions: getRequiredPermissions(sanitizedSite, sanitizedRedirectUrl)
      }, { status: 403 })
    }

    // Generate secure auth token for the authorized user
    const authToken = generateAuthToken(userId, userRole)
    
    // Create the redirect URL with auth token and metadata
    const authorizedUrl = new URL(sanitizedRedirectUrl)
    authorizedUrl.searchParams.set('auth_token', authToken)
    authorizedUrl.searchParams.set('user_id', userId)
    authorizedUrl.searchParams.set('user_email', user.emailAddresses[0]?.emailAddress || '')
    authorizedUrl.searchParams.set('user_role', userRole)
    authorizedUrl.searchParams.set('site_name', sanitizedSite)
    authorizedUrl.searchParams.set('timestamp', Date.now().toString())

    // Log successful authorization
    console.log(`AUTH SUCCESS: User ${user.emailAddresses[0]?.emailAddress} (${userId}) authorized for: ${sanitizedSite} → ${sanitizedRedirectUrl}`)

    return NextResponse.json({
      authorized: true,
      redirectUrl: authorizedUrl.toString(),
      siteName: sanitizedSite,
      userRole: userRole,
      userEmail: user.emailAddresses[0]?.emailAddress,
      tokenExpiry: '1 hour',
      permissions: userSiteAccess
    })

  } catch (error) {
    console.error('Universal authorization error:', error)
    return NextResponse.json(
      { error: 'Authorization system error' }, 
      { status: 500 }
    )
  }
}

// Universal site access checker - works for ANY application without pre-configuration
function checkUniversalSiteAccess(
  requestedSite: string, 
  userRole: string, 
  userSiteAccess: string[], 
  redirectUrl: string
): boolean {
  
  // Super admin has universal access
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return true
  }

  // Admin has access to most sites (except super-admin exclusive)
  if (userRole === USER_ROLES.ADMIN) {
    const adminRestrictedKeywords = ['super-admin', 'root', 'system']
    const isRestricted = adminRestrictedKeywords.some(keyword => 
      requestedSite.toLowerCase().includes(keyword) || 
      redirectUrl.toLowerCase().includes(keyword)
    )
    return !isRestricted
  }

  // Check direct URL permissions (exact matches)
  if (userSiteAccess.includes(redirectUrl)) {
    return true
  }

  // Check if user has specific site permission
  if (userSiteAccess.includes(requestedSite.toLowerCase())) {
    return true
  }

  // Check domain-based permissions
  try {
    const urlObj = new URL(redirectUrl)
    const domain = urlObj.hostname
    
    // Check if user has permission for this domain
    if (userSiteAccess.some(permission => 
      permission.includes(domain) || 
      domain.includes(permission)
    )) {
      return true
    }
  } catch {
    // Invalid URL, skip domain check
  }

  // Role-based universal permissions
  const rolePermissions: Record<string, string[]> = {
    [USER_ROLES.PREMIUM]: ['premium_sites', 'standard_sites'],
    [USER_ROLES.STANDARD]: ['standard_sites'],
    [USER_ROLES.GUEST]: []
  }

  const allowedPermissions = rolePermissions[userRole] || []
  
  // Check if user has any universal permissions that apply
  const hasUniversalPermission = allowedPermissions.some(permission => 
    userSiteAccess.includes(permission)
  )

  if (hasUniversalPermission) {
    // Apply additional filtering for sensitive sites
    const sensitiveKeywords = ['admin', 'management', 'control', 'system']
    const isSensitive = sensitiveKeywords.some(keyword => 
      requestedSite.toLowerCase().includes(keyword) ||
      redirectUrl.toLowerCase().includes(keyword)
    )
    
    // Premium/Standard users can't access admin sites unless specifically granted
    if (isSensitive && userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
      return userSiteAccess.includes('admin_access') || userSiteAccess.includes(redirectUrl)
    }
    
    return true
  }

  // Final fallback: check for any matching permission patterns
  return userSiteAccess.some(permission => {
    if (permission.includes('all_sites')) return true
    if (requestedSite.toLowerCase().includes(permission.toLowerCase())) return true
    if (redirectUrl.toLowerCase().includes(permission.toLowerCase())) return true
    return false
  })
}

// Helper function to determine what permissions would be needed
function getRequiredPermissions(siteName: string, redirectUrl: string): string[] {
  const suggestions = []
  
  // Domain-based suggestion
  try {
    const urlObj = new URL(redirectUrl)
    suggestions.push(urlObj.hostname)
  } catch {
    // Invalid URL
  }
  
  // Site name suggestion
  suggestions.push(siteName.toLowerCase())
  
  // Category-based suggestions
  const categoryKeywords = {
    'admin': ['admin_access', 'management_tools'],
    'premium': ['premium_sites', 'premium_content'],
    'analytics': ['analytics_access', 'reports'],
    'dashboard': ['standard_sites', 'dashboard_access']
  }
  
  Object.entries(categoryKeywords).forEach(([keyword, perms]) => {
    if (siteName.toLowerCase().includes(keyword) || redirectUrl.toLowerCase().includes(keyword)) {
      suggestions.push(...perms)
    }
  })
  
  return [...new Set(suggestions)] // Remove duplicates
}