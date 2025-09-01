import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { USER_ROLES, SITE_PERMISSIONS } from '@/lib/auth-config'
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
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 })
    }

    // Sanitize inputs
    const sanitizedSite = sanitizeString(requestedSite)
    const sanitizedRedirectUrl = sanitizeString(redirectUrl)

    // Validate redirect URL format
    try {
      new URL(sanitizedRedirectUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid redirect URL' }, { status: 400 })
    }

    // Get user data from Clerk
    const user = await clerkClient.users.getUser(userId)
    const userRole = (user.publicMetadata?.role as string) || USER_ROLES.GUEST
    const userSiteAccess = (user.publicMetadata?.siteAccess as string[]) || []

    // Check if user has permission for requested site
    const hasAccess = checkSiteAccess(sanitizedSite, userRole, userSiteAccess)

    if (!hasAccess) {
      // Log unauthorized access attempt
      console.log(`SECURITY: Unauthorized access attempt by ${user.emailAddresses[0]?.emailAddress} (${userId}) for site: ${sanitizedSite}`)
      
      return NextResponse.json({ 
        authorized: false, 
        error: 'Access denied for requested site' 
      }, { status: 403 })
    }

    // Generate secure auth token for the authorized user
    const authToken = generateAuthToken(userId, userRole)
    
    // Create the redirect URL with auth token
    const authorizedUrl = new URL(sanitizedRedirectUrl)
    authorizedUrl.searchParams.set('auth_token', authToken)
    authorizedUrl.searchParams.set('user_id', userId)
    authorizedUrl.searchParams.set('timestamp', Date.now().toString())

    // Log successful authorization
    console.log(`SECURITY: User ${user.emailAddresses[0]?.emailAddress} (${userId}) authorized for site: ${sanitizedSite}`)

    return NextResponse.json({
      authorized: true,
      redirectUrl: authorizedUrl.toString(),
      userRole: userRole,
      siteAccess: userSiteAccess
    })

  } catch (error) {
    console.error('Authorization error:', error)
    return NextResponse.json(
      { error: 'Authorization failed' }, 
      { status: 500 }
    )
  }
}

// Check if user has access to the requested site - now works with any URL
function checkSiteAccess(requestedSite: string, userRole: string, userSiteAccess: string[]): boolean {
  // Super admin has access to everything
  if (userRole === USER_ROLES.SUPER_ADMIN) {
    return true
  }

  // Admin has access to most sites (except super admin exclusive)
  if (userRole === USER_ROLES.ADMIN && !requestedSite.toLowerCase().includes('super-admin')) {
    return true
  }

  // Check if user has specific URL access
  const hasDirectUrlAccess = userSiteAccess.some(permission => {
    // Check for exact URL match
    if (permission.startsWith('http')) {
      return permission === requestedSite || requestedSite.includes(permission)
    }
    return false
  })

  if (hasDirectUrlAccess) {
    return true
  }

  // Check category-based access
  if (userSiteAccess.includes('all_sites')) {
    return true
  }

  // Legacy mapping for backward compatibility
  const legacyMapping: Record<string, string[]> = {
    'houseatreides': ['premium_sites', 'premium_tools', 'https://www.houseatreides.space'],
    'premium': ['premium_sites', 'premium_tools'],
    'dashboard': ['standard_sites', 'basic_tools'],
    'admin': ['nitroauth_admin', 'admin_dashboard']
  }

  // Check legacy patterns
  for (const [pattern, permissions] of Object.entries(legacyMapping)) {
    if (requestedSite.toLowerCase().includes(pattern)) {
      return permissions.some(permission => userSiteAccess.includes(permission))
    }
  }

  // Default: check if user has standard site access
  return userSiteAccess.includes('standard_sites') || userSiteAccess.includes('basic_tools')
}