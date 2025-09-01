import { auth, currentUser } from '@clerk/nextjs/server'
import { User } from '@clerk/nextjs/server'
import { ROLE_PERMISSIONS, SITE_URLS, DEFAULT_REDIRECTS, USER_ROLES, type UserRole, type SitePermission } from './auth-config'

/**
 * Get user's role from Clerk metadata
 */
export function getUserRole(user: User): UserRole {
  const role = user.publicMetadata?.role as UserRole
  return role || USER_ROLES.GUEST
}

/**
 * Check if user has permission to access a specific site
 */
export function hasPermission(userRole: UserRole, permission: SitePermission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || []
  return rolePermissions.includes(permission)
}

/**
 * Get all sites user can access
 */
export function getUserAccessibleSites(userRole: UserRole): Array<{permission: SitePermission, url: string}> {
  const permissions = ROLE_PERMISSIONS[userRole] || []
  return permissions.map(permission => ({
    permission,
    url: SITE_URLS[permission]
  }))
}

/**
 * Get default redirect URL for user based on role
 */
export function getDefaultRedirect(userRole: UserRole): string {
  return DEFAULT_REDIRECTS[userRole] || 'https://profile.nitroauth.com'
}

/**
 * Generate authenticated redirect URL with token
 */
export function generateAuthRedirect(targetUrl: string, userId: string, userRole: UserRole): string {
  const authToken = Buffer.from(JSON.stringify({
    userId,
    role: userRole,
    timestamp: Date.now(),
    // Add signature/validation if needed
  })).toString('base64')
  
  const url = new URL(targetUrl)
  url.searchParams.set('auth_token', authToken)
  url.searchParams.set('source', 'nitroauth')
  
  return url.toString()
}

/**
 * Validate if user can access requested site
 */
export async function validateSiteAccess(requestedSite: string): Promise<{
  authorized: boolean
  redirectUrl?: string
  error?: string
}> {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return {
        authorized: false,
        error: 'User not authenticated'
      }
    }
    
    const user = await currentUser()
    if (!user) {
      return {
        authorized: false, 
        error: 'User not found'
      }
    }
    
    const userRole = getUserRole(user)
    
    // Find the permission needed for requested site
    const requiredPermission = Object.entries(SITE_URLS).find(
      ([permission, url]) => url === requestedSite
    )?.[0] as SitePermission
    
    if (!requiredPermission) {
      return {
        authorized: false,
        error: 'Invalid site requested'
      }
    }
    
    const authorized = hasPermission(userRole, requiredPermission)
    
    if (authorized) {
      const authRedirectUrl = generateAuthRedirect(requestedSite, userId, userRole)
      return {
        authorized: true,
        redirectUrl: authRedirectUrl
      }
    } else {
      // Redirect to their default allowed site
      const defaultUrl = getDefaultRedirect(userRole)
      const authRedirectUrl = generateAuthRedirect(defaultUrl, userId, userRole)
      
      return {
        authorized: false,
        redirectUrl: authRedirectUrl,
        error: 'Insufficient permissions for requested site'
      }
    }
    
  } catch (error) {
    return {
      authorized: false,
      error: 'Authorization check failed'
    }
  }
}