import { verifyAuthToken } from './jwt'

// Enhanced permission system for external sites
export interface PermissionContext {
  userId: string
  role: string
  siteAccess: string[]
  metadata?: {
    department?: string
    team?: string
    projects?: string[]
    ipAddress?: string
    timeZone?: string
  }
  constraints?: {
    timeRestriction?: {
      startHour: number // 0-23
      endHour: number   // 0-23
      days: number[]    // 0-6 (Sunday-Saturday)
    }
    ipWhitelist?: string[]
    maxSessionDuration?: number // minutes
  }
}

// Fine-grained permission structure
export interface FineGrainedPermission {
  resource: string      // e.g., "dashboard", "analytics", "user_management"
  action: string        // e.g., "read", "write", "delete", "admin"
  scope?: string        // e.g., "own", "team", "department", "all"
  conditions?: {
    timeRestriction?: boolean
    ipRestriction?: boolean
    mfaRequired?: boolean
  }
}

// External site configuration
export interface ExternalSiteConfig {
  siteId: string
  siteName: string
  baseUrl: string
  permissions: FineGrainedPermission[]
  requiresCustomValidation?: boolean
  webhookUrl?: string
  tokenValidationEndpoint?: string
  ssoLogoutUrl?: string
}

/**
 * Validate and process authentication token for external sites
 */
export async function validateExternalAuth(token: string, siteId: string, ipAddress?: string): Promise<{
  valid: boolean
  user?: PermissionContext
  permissions?: FineGrainedPermission[]
  error?: string
  sessionInfo?: {
    expiresAt: Date
    renewAt: Date
    sessionId: string
  }
}> {
  try {
    // Verify JWT token
    const tokenData = verifyAuthToken(token)
    if (!tokenData) {
      return { valid: false, error: 'Invalid or expired token' }
    }

    // Get user permissions from database/cache
    const user = await getUserPermissionContext(tokenData.userId)
    if (!user) {
      return { valid: false, error: 'User not found' }
    }

    // Get site-specific configuration
    const siteConfig = await getSiteConfiguration(siteId)
    if (!siteConfig) {
      return { valid: false, error: 'Site not configured' }
    }

    // Check if user has access to this site
    const hasAccess = checkSiteAccess(user, siteConfig)
    if (!hasAccess) {
      return { valid: false, error: 'Insufficient permissions for this site' }
    }

    // Apply time restrictions
    if (!checkTimeRestrictions(user)) {
      return { valid: false, error: 'Access not allowed at this time' }
    }

    // Apply IP restrictions
    if (ipAddress && !checkIpRestrictions(user, ipAddress)) {
      return { valid: false, error: 'Access not allowed from this location' }
    }

    // Generate fine-grained permissions for this user/site
    const permissions = generateFineGrainedPermissions(user, siteConfig)

    // Create session info
    const sessionInfo = {
      expiresAt: new Date(Date.now() + (user.constraints?.maxSessionDuration || 480) * 60 * 1000), // Default 8 hours
      renewAt: new Date(Date.now() + 55 * 60 * 1000), // Renew after 55 minutes
      sessionId: `${user.userId}_${siteId}_${Date.now()}`
    }

    // Log successful access
    await logAccessEvent(user.userId, siteId, 'access_granted', ipAddress)

    return {
      valid: true,
      user,
      permissions,
      sessionInfo
    }

  } catch (error) {
    console.error('External auth validation error:', error)
    return { valid: false, error: 'Authentication validation failed' }
  }
}

/**
 * Generate permission matrix for external site
 */
export function generatePermissionMatrix(user: PermissionContext, siteConfig: ExternalSiteConfig): Record<string, boolean> {
  const matrix: Record<string, boolean> = {}
  
  siteConfig.permissions.forEach(permission => {
    const key = `${permission.resource}:${permission.action}`
    matrix[key] = hasPermission(user, permission)
    
    // Add scope-specific permissions
    if (permission.scope) {
      matrix[`${key}:${permission.scope}`] = hasPermission(user, permission)
    }
  })

  return matrix
}

/**
 * Check if user has specific permission
 */
function hasPermission(user: PermissionContext, permission: FineGrainedPermission): boolean {
  // Role-based access
  const roleHierarchy = {
    'super_admin': 5,
    'admin': 4,
    'premium': 3,
    'standard': 2,
    'guest': 1
  }

  // Super admin has all permissions
  if (user.role === 'super_admin') {
    return true
  }

  // Check if user has direct site access
  const hasDirectAccess = user.siteAccess.some(access => 
    access === permission.resource || 
    access.includes(permission.resource) ||
    access === 'all_sites'
  )

  if (!hasDirectAccess) {
    return false
  }

  // Check action level permissions
  const userRoleLevel = roleHierarchy[user.role as keyof typeof roleHierarchy] || 0
  
  switch (permission.action) {
    case 'read':
      return userRoleLevel >= 1
    case 'write':
      return userRoleLevel >= 2
    case 'delete':
      return userRoleLevel >= 3
    case 'admin':
      return userRoleLevel >= 4
    default:
      return userRoleLevel >= 2
  }
}

/**
 * Helper functions (would be implemented with actual database calls)
 */
async function getUserPermissionContext(userId: string): Promise<PermissionContext | null> {
  // In real implementation, fetch from database
  // This is a placeholder
  return null
}

async function getSiteConfiguration(siteId: string): Promise<ExternalSiteConfig | null> {
  // In real implementation, fetch from configuration database
  // This is a placeholder
  return null
}

function checkSiteAccess(user: PermissionContext, site: ExternalSiteConfig): boolean {
  return user.siteAccess.includes(site.siteId) || 
         user.siteAccess.includes('all_sites') ||
         user.role === 'super_admin'
}

function checkTimeRestrictions(user: PermissionContext): boolean {
  if (!user.constraints?.timeRestriction) {
    return true
  }

  const now = new Date()
  const currentHour = now.getHours()
  const currentDay = now.getDay()

  const { startHour, endHour, days } = user.constraints.timeRestriction

  return days.includes(currentDay) && currentHour >= startHour && currentHour <= endHour
}

function checkIpRestrictions(user: PermissionContext, ipAddress: string): boolean {
  if (!user.constraints?.ipWhitelist) {
    return true
  }

  return user.constraints.ipWhitelist.includes(ipAddress)
}

async function logAccessEvent(userId: string, siteId: string, action: string, ipAddress?: string): Promise<void> {
  try {
    await fetch('/api/admin/audit-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        siteId,
        action,
        ipAddress,
        timestamp: new Date().toISOString()
      })
    })
  } catch (error) {
    console.error('Failed to log access event:', error)
  }
}

// External site helper functions
export const ExternalSiteHelpers = {
  /**
   * Generate integration code for external sites
   */
  generateIntegrationCode: (siteId: string, apiKey: string) => {
    return {
      javascript: `
// NitroAuth Integration
class NitroAuth {
  constructor(apiKey, siteId) {
    this.apiKey = apiKey;
    this.siteId = siteId;
    this.baseUrl = 'https://your-nitroauth-domain.com';
  }

  async validateUser(token) {
    try {
      const response = await fetch(\`\${this.baseUrl}/api/validate\`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey
        },
        body: JSON.stringify({
          token,
          siteId: this.siteId,
          ipAddress: this.getUserIP()
        })
      });

      return await response.json();
    } catch (error) {
      console.error('NitroAuth validation failed:', error);
      return { valid: false, error: 'Validation failed' };
    }
  }

  hasPermission(permissions, resource, action, scope = null) {
    const key = scope ? \`\${resource}:\${action}:\${scope}\` : \`\${resource}:\${action}\`;
    return permissions[key] === true;
  }

  getUserIP() {
    // Implementation depends on your setup
    return null;
  }
}

// Usage
const nitroAuth = new NitroAuth('${apiKey}', '${siteId}');
`,
      python: `
# NitroAuth Python Integration
import requests
import json

class NitroAuth:
    def __init__(self, api_key, site_id):
        self.api_key = api_key
        self.site_id = site_id
        self.base_url = "https://your-nitroauth-domain.com"

    def validate_user(self, token, ip_address=None):
        try:
            response = requests.post(
                f"{self.base_url}/api/validate",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": self.api_key
                },
                json={
                    "token": token,
                    "siteId": self.site_id,
                    "ipAddress": ip_address
                }
            )
            return response.json()
        except Exception as e:
            print(f"NitroAuth validation failed: {e}")
            return {"valid": False, "error": "Validation failed"}

    def has_permission(self, permissions, resource, action, scope=None):
        key = f"{resource}:{action}:{scope}" if scope else f"{resource}:{action}"
        return permissions.get(key, False)

# Usage
nitro_auth = NitroAuth('${apiKey}', '${siteId}')
`,
      php: `
<?php
// NitroAuth PHP Integration
class NitroAuth {
    private $apiKey;
    private $siteId;
    private $baseUrl = 'https://your-nitroauth-domain.com';

    public function __construct($apiKey, $siteId) {
        $this->apiKey = $apiKey;
        $this->siteId = $siteId;
    }

    public function validateUser($token, $ipAddress = null) {
        $data = [
            'token' => $token,
            'siteId' => $this->siteId,
            'ipAddress' => $ipAddress
        ];

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\\r\\n" .
                           "X-API-Key: {$this->apiKey}\\r\\n",
                'content' => json_encode($data)
            ]
        ]);

        $response = file_get_contents($this->baseUrl . '/api/validate', false, $context);
        return json_decode($response, true);
    }

    public function hasPermission($permissions, $resource, $action, $scope = null) {
        $key = $scope ? "{$resource}:{$action}:{$scope}" : "{$resource}:{$action}";
        return isset($permissions[$key]) && $permissions[$key] === true;
    }
}

// Usage
$nitroAuth = new NitroAuth('${apiKey}', '${siteId}');
?>
`
    }
  },

  /**
   * Common edge cases documentation
   */
  getEdgeCasesDocumentation: () => ({
    tokenExpiration: {
      issue: "JWT tokens expire after 1 hour",
      solution: "Implement token refresh logic or redirect to re-authentication"
    },
    networkFailure: {
      issue: "NitroAuth service unavailable",
      solution: "Implement graceful degradation or cached permissions"
    },
    permissionChanges: {
      issue: "User permissions change while they're using your site",
      solution: "Re-validate permissions periodically or on sensitive actions"
    },
    ipRestrictions: {
      issue: "User IP changes (mobile users, VPN)",
      solution: "Allow IP changes within session or require re-authentication"
    },
    timeZoneHandling: {
      issue: "Time restrictions across different time zones",
      solution: "Store user timezone and convert restrictions accordingly"
    }
  })
}