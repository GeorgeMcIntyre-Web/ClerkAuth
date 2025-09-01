// User roles and their permissions
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  PREMIUM: 'premium',
  STANDARD: 'standard',
  GUEST: 'guest'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Site access permissions
export const SITE_PERMISSIONS = {
  // Admin sites
  ADMIN_DASHBOARD: 'admin_dashboard',
  USER_MANAGEMENT: 'user_management',
  ANALYTICS: 'analytics',
  
  // Business sites  
  CRM_SYSTEM: 'crm_system',
  ACCOUNTING: 'accounting',
  PROJECT_MGMT: 'project_management',
  
  // User sites
  PROFILE: 'profile',
  BASIC_TOOLS: 'basic_tools',
  PREMIUM_TOOLS: 'premium_tools'
} as const

export type SitePermission = typeof SITE_PERMISSIONS[keyof typeof SITE_PERMISSIONS]

// Role to permissions mapping
export const ROLE_PERMISSIONS: Record<UserRole, SitePermission[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    SITE_PERMISSIONS.ADMIN_DASHBOARD,
    SITE_PERMISSIONS.USER_MANAGEMENT,
    SITE_PERMISSIONS.ANALYTICS,
    SITE_PERMISSIONS.CRM_SYSTEM,
    SITE_PERMISSIONS.ACCOUNTING,
    SITE_PERMISSIONS.PROJECT_MGMT,
    SITE_PERMISSIONS.PROFILE,
    SITE_PERMISSIONS.BASIC_TOOLS,
    SITE_PERMISSIONS.PREMIUM_TOOLS
  ],
  
  [USER_ROLES.ADMIN]: [
    SITE_PERMISSIONS.ADMIN_DASHBOARD,
    SITE_PERMISSIONS.USER_MANAGEMENT,
    SITE_PERMISSIONS.CRM_SYSTEM,
    SITE_PERMISSIONS.PROJECT_MGMT,
    SITE_PERMISSIONS.PROFILE,
    SITE_PERMISSIONS.BASIC_TOOLS,
    SITE_PERMISSIONS.PREMIUM_TOOLS
  ],
  
  [USER_ROLES.PREMIUM]: [
    SITE_PERMISSIONS.CRM_SYSTEM,
    SITE_PERMISSIONS.PROJECT_MGMT,
    SITE_PERMISSIONS.PROFILE,
    SITE_PERMISSIONS.BASIC_TOOLS,
    SITE_PERMISSIONS.PREMIUM_TOOLS
  ],
  
  [USER_ROLES.STANDARD]: [
    SITE_PERMISSIONS.PROFILE,
    SITE_PERMISSIONS.BASIC_TOOLS
  ],
  
  [USER_ROLES.GUEST]: [
    SITE_PERMISSIONS.PROFILE
  ]
}

// Site URLs mapping
export const SITE_URLS: Record<SitePermission, string> = {
  [SITE_PERMISSIONS.ADMIN_DASHBOARD]: 'https://admin.nitroauth.com',
  [SITE_PERMISSIONS.USER_MANAGEMENT]: 'https://users.nitroauth.com', 
  [SITE_PERMISSIONS.ANALYTICS]: 'https://analytics.nitroauth.com',
  [SITE_PERMISSIONS.CRM_SYSTEM]: 'https://crm.nitroauth.com',
  [SITE_PERMISSIONS.ACCOUNTING]: 'https://accounting.nitroauth.com',
  [SITE_PERMISSIONS.PROJECT_MGMT]: 'https://projects.nitroauth.com',
  [SITE_PERMISSIONS.PROFILE]: 'https://profile.nitroauth.com',
  [SITE_PERMISSIONS.BASIC_TOOLS]: 'https://tools.nitroauth.com',
  [SITE_PERMISSIONS.PREMIUM_TOOLS]: 'https://premium.nitroauth.com'
}

// Default redirect based on role
export const DEFAULT_REDIRECTS: Record<UserRole, string> = {
  [USER_ROLES.SUPER_ADMIN]: SITE_URLS[SITE_PERMISSIONS.ADMIN_DASHBOARD],
  [USER_ROLES.ADMIN]: SITE_URLS[SITE_PERMISSIONS.ADMIN_DASHBOARD],
  [USER_ROLES.PREMIUM]: SITE_URLS[SITE_PERMISSIONS.PREMIUM_TOOLS],
  [USER_ROLES.STANDARD]: SITE_URLS[SITE_PERMISSIONS.BASIC_TOOLS],
  [USER_ROLES.GUEST]: SITE_URLS[SITE_PERMISSIONS.PROFILE]
}