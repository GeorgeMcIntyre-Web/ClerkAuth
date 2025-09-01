// User roles and their permissions
export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin', 
  PREMIUM: 'premium',
  STANDARD: 'standard',
  GUEST: 'guest'
} as const

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES]

// Universal site access - now supports any URL
export const SITE_PERMISSIONS = {
  // NitroAuth Admin
  NITROAUTH_ADMIN: 'nitroauth_admin',
  
  // Universal site access
  ALL_SITES: 'all_sites',
  PREMIUM_SITES: 'premium_sites',
  STANDARD_SITES: 'standard_sites',
  
  // Specific sites (examples - can add any URL)
  HOUSE_ATREIDES: 'https://www.houseatreides.space',
  ANALYTICS_SITE: 'https://analytics.example.com',
  CRM_SITE: 'https://crm.example.com',
  
  // Custom URLs (admin can add any URL)
  CUSTOM_URL_1: 'custom_url_1',
  CUSTOM_URL_2: 'custom_url_2',
  CUSTOM_URL_3: 'custom_url_3',
  CUSTOM_URL_4: 'custom_url_4',
  CUSTOM_URL_5: 'custom_url_5'
} as const

export type SitePermission = typeof SITE_PERMISSIONS[keyof typeof SITE_PERMISSIONS]

// Role to permissions mapping - now universal
export const ROLE_PERMISSIONS: Record<UserRole, SitePermission[]> = {
  [USER_ROLES.SUPER_ADMIN]: [
    SITE_PERMISSIONS.ALL_SITES,  // Super admin gets access to everything
    SITE_PERMISSIONS.NITROAUTH_ADMIN
  ],
  
  [USER_ROLES.ADMIN]: [
    SITE_PERMISSIONS.PREMIUM_SITES,
    SITE_PERMISSIONS.STANDARD_SITES,
    SITE_PERMISSIONS.NITROAUTH_ADMIN
  ],
  
  [USER_ROLES.PREMIUM]: [
    SITE_PERMISSIONS.PREMIUM_SITES,
    SITE_PERMISSIONS.STANDARD_SITES
  ],
  
  [USER_ROLES.STANDARD]: [
    SITE_PERMISSIONS.STANDARD_SITES
  ],
  
  [USER_ROLES.GUEST]: [
    // Guests have no default access - must be granted specific URLs
  ]
}

// URL mapping for sites - admin can configure these
export const SITE_URL_MAPPING: Record<string, string> = {
  'houseatreides': 'https://www.houseatreides.space',
  'analytics': 'https://analytics.example.com',
  'crm': 'https://crm.example.com',
  // Add more as needed
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