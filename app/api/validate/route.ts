import { NextResponse } from 'next/server'
import { verifyAuthToken, isTokenExpired } from '@/lib/jwt'
import { clerkClient } from '@clerk/nextjs/server'
import { USER_ROLES } from '@/lib/auth-config'
import { withRateLimit, rateLimitConfigs, getClientIP } from '@/lib/rate-limit'
import { cache, withCache } from '@/lib/cache'
import { log, logApi, LogCategory } from '@/lib/logger'

export async function POST(req: Request) {
  const clientIP = getClientIP(req)
  
  return withRateLimit(rateLimitConfigs.validate, clientIP, async () => {
  const startTime = Date.now()
  
  try {
    const body = await req.json()
    const { auth_token, user_id, siteId, requestedPermissions } = body

    if (!auth_token || !user_id) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }

    // Get IP and user agent for logging
    const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                    req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'Unknown'

    // Check if token is expired
    if (isTokenExpired(auth_token)) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token expired' 
      }, { status: 401 })
    }

    // Verify JWT token
    const tokenData = verifyAuthToken(auth_token)
    if (!tokenData) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid token' 
      }, { status: 401 })
    }

    // Verify user ID matches token
    if (tokenData.userId !== user_id) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token user mismatch' 
      }, { status: 401 })
    }

    // Get user data with caching to improve performance
    try {
      // Try to get cached user validation data first
      const cachedValidation = await cache.getUserValidation(user_id)
      
      let currentRole: string
      let currentSiteAccess: string[]
      let permissions: Record<string, boolean> = {}
      
      if (cachedValidation && Date.now() - cachedValidation.timestamp < 300000) { // 5 minutes
        // Use cached data
        currentRole = cachedValidation.role
        currentSiteAccess = cachedValidation.siteAccess
        permissions = cachedValidation.permissions
        
        log.debug({
          message: 'Using cached user validation data',
          category: LogCategory.API,
          userId: user_id,
          metadata: { siteId, cacheHit: true }
        })
      } else {
        // Fetch fresh data from Clerk
        const user = await clerkClient.users.getUser(user_id)
        currentRole = (user.publicMetadata?.role as string) || 'GUEST'
        currentSiteAccess = (user.publicMetadata?.siteAccess as string[]) || []
        
        // Generate fine-grained permissions if siteId provided
        permissions = siteId ? generateDetailedPermissions(siteId, currentRole, currentSiteAccess) : {}
        
        // Cache the validation data
        await cache.setUserValidation(user_id, {
          valid: true,
          role: currentRole,
          siteAccess: currentSiteAccess,
          permissions,
          timestamp: Date.now()
        })
        
        log.debug({
          message: 'Fetched and cached fresh user validation data',
          category: LogCategory.API,
          userId: user_id,
          metadata: { siteId, cacheHit: false }
        })
      }
      
      // Check specific permissions if requested
      let permissionResults = {}
      if (requestedPermissions && Array.isArray(requestedPermissions)) {
        permissionResults = requestedPermissions.reduce((acc, permission) => {
          acc[permission] = permissions[permission] || false
          return acc
        }, {} as Record<string, boolean>)
      }

      // Log successful validation
      await logValidationEvent({
        userId: user_id,
        siteId: siteId || 'unknown',
        ipAddress: clientIP,
        userAgent,
        success: true
      })

      return NextResponse.json({
        valid: true,
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          role: currentRole,
          siteAccess: currentSiteAccess,
          firstName: user.firstName,
          lastName: user.lastName
        },
        permissions: permissions,
        requestedPermissions: permissionResults,
        sessionInfo: {
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
          renewAt: new Date(Date.now() + 55 * 60 * 1000), // 55 minutes
          sessionId: `${user_id}_${siteId || 'default'}_${Date.now()}`
        },
        tokenData: {
          timestamp: tokenData.timestamp,
          role: tokenData.role
        }
      })

    } catch (userError) {
      console.error('User validation error:', userError)
      return NextResponse.json({ 
        valid: false, 
        error: 'User validation failed' 
      }, { status: 401 })
    }

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Validation failed' }, 
      { status: 500 }
    )
  }
  })
}

// GET endpoint for external sites to check token validity quickly
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const auth_token = searchParams.get('auth_token')
  const user_id = searchParams.get('user_id')

  if (!auth_token || !user_id) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Missing parameters' 
    }, { status: 400 })
  }

  // Quick token validation without full user data
  if (isTokenExpired(auth_token)) {
    return NextResponse.json({ valid: false, error: 'Token expired' })
  }

  const tokenData = verifyAuthToken(auth_token)
  if (!tokenData || tokenData.userId !== user_id) {
    return NextResponse.json({ valid: false, error: 'Invalid token' })
  }

  return NextResponse.json({ 
    valid: true, 
    role: tokenData.role,
    timestamp: tokenData.timestamp 
  })
}

// Helper function to generate detailed permissions for a site
function generateDetailedPermissions(siteId: string, userRole: string, siteAccess: string[]): Record<string, boolean> {
  const permissions: Record<string, boolean> = {}

  // Role-based permissions hierarchy
  const rolePermissions = {
    [USER_ROLES.SUPER_ADMIN]: {
      'dashboard:read': true,
      'dashboard:write': true,
      'dashboard:admin': true,
      'users:read': true,
      'users:write': true,
      'users:delete': true,
      'users:admin': true,
      'reports:read': true,
      'reports:write': true,
      'reports:admin': true,
      'settings:read': true,
      'settings:write': true,
      'settings:admin': true,
      'analytics:read': true,
      'analytics:write': true,
      'analytics:admin': true,
      'billing:read': true,
      'billing:write': true,
      'billing:admin': true
    },
    [USER_ROLES.ADMIN]: {
      'dashboard:read': true,
      'dashboard:write': true,
      'users:read': true,
      'users:write': true,
      'reports:read': true,
      'reports:write': true,
      'settings:read': true,
      'settings:write': true,
      'analytics:read': true,
      'analytics:write': true,
      'billing:read': true
    },
    [USER_ROLES.PREMIUM]: {
      'dashboard:read': true,
      'dashboard:write': true,
      'users:read': true,
      'reports:read': true,
      'settings:read': true,
      'analytics:read': true,
      'billing:read': true
    },
    [USER_ROLES.STANDARD]: {
      'dashboard:read': true,
      'users:read': true,
      'settings:read': true,
      'analytics:read': true
    },
    [USER_ROLES.GUEST]: {
      'dashboard:read': true
    }
  }

  // Start with role-based permissions
  const userRolePermissions = rolePermissions[userRole as keyof typeof rolePermissions] || rolePermissions[USER_ROLES.GUEST]
  Object.assign(permissions, userRolePermissions)

  // Apply site-specific access enhancements
  siteAccess.forEach(access => {
    // Universal permissions
    if (access === 'all_sites') {
      Object.keys(rolePermissions[USER_ROLES.SUPER_ADMIN]).forEach(perm => {
        permissions[perm] = true
      })
    }
    
    // Specific permission overrides
    switch (access) {
      case 'admin_dashboard':
      case 'admin_sites':
        permissions['dashboard:admin'] = true
        permissions['users:admin'] = true
        break
      case 'user_management_full':
        permissions['users:admin'] = true
        permissions['users:delete'] = true
        break
      case 'reports_admin':
        permissions['reports:admin'] = true
        break
      case 'analytics_admin':
        permissions['analytics:admin'] = true
        break
      case 'billing_admin':
        permissions['billing:admin'] = true
        break
      case 'premium_sites':
        permissions['analytics:write'] = true
        permissions['reports:write'] = true
        break
    }

    // Site-specific permissions
    if (access.includes(siteId)) {
      // Grant enhanced permissions for this specific site
      permissions['site_specific:admin'] = true
    }
  })

  return permissions
}

// Helper function to log validation events
async function logValidationEvent(event: {
  userId: string
  siteId: string
  ipAddress: string
  userAgent: string
  success: boolean
  error?: string
}) {
  try {
    // In production, this would use your audit logging system
    console.log('Validation Event:', {
      userId: event.userId,
      siteId: event.siteId,
      ipAddress: event.ipAddress,
      success: event.success,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to log validation event:', error)
  }
}