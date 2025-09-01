// Test utilities and mocks for API testing

import { USER_ROLES } from '@/lib/auth-config'

// Mock Clerk user data factory
export const createMockUser = (overrides: Partial<any> = {}) => ({
  id: overrides.id || 'user_test123',
  emailAddresses: [{ emailAddress: overrides.email || 'test@example.com' }],
  firstName: overrides.firstName || 'Test',
  lastName: overrides.lastName || 'User',
  publicMetadata: {
    role: overrides.role || USER_ROLES.STANDARD,
    siteAccess: overrides.siteAccess || ['standard_sites'],
    ...overrides.publicMetadata
  },
  createdAt: overrides.createdAt || Date.now(),
  lastSignInAt: overrides.lastSignInAt || Date.now(),
  ...overrides
})

// Mock JWT token factory
export const createMockJWT = (overrides: Partial<any> = {}) => ({
  userId: overrides.userId || 'user_test123',
  role: overrides.role || USER_ROLES.STANDARD,
  timestamp: overrides.timestamp || Date.now(),
  issuer: 'nitroauth',
  audience: 'authorized-sites',
  ...overrides
})

// Mock request factory
export const createMockRequest = (
  url: string, 
  options: {
    method?: string
    body?: any
    headers?: Record<string, string>
  } = {}
) => {
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Test Browser',
    'x-forwarded-for': '192.168.1.100',
    ...options.headers
  }

  return new Request(url, {
    method: options.method || 'POST',
    headers: defaultHeaders,
    body: options.body ? JSON.stringify(options.body) : undefined
  })
}

// Mock database site data
export const createMockSite = (overrides: Partial<any> = {}) => ({
  id: overrides.id || 'site_test123',
  name: overrides.name || 'Test Site',
  url: overrides.url || 'https://test.example.com',
  description: overrides.description || 'Test site description',
  category: overrides.category || 'standard',
  isActive: overrides.isActive !== undefined ? overrides.isActive : true,
  createdAt: overrides.createdAt || new Date(),
  updatedAt: overrides.updatedAt || new Date(),
  ...overrides
})

// Mock validation cache data
export const createMockValidationCache = (overrides: Partial<any> = {}) => ({
  valid: overrides.valid !== undefined ? overrides.valid : true,
  role: overrides.role || USER_ROLES.STANDARD,
  siteAccess: overrides.siteAccess || ['standard_sites'],
  permissions: overrides.permissions || {},
  timestamp: overrides.timestamp || Date.now(),
  ...overrides
})

// Common test error messages
export const TEST_ERRORS = {
  UNAUTHORIZED: 'Unauthorized',
  ADMIN_ACCESS_REQUIRED: 'Admin access required',
  SUPER_ADMIN_ACCESS_REQUIRED: 'Super admin access required',
  MISSING_PARAMETERS: 'Missing required parameters',
  INVALID_TOKEN: 'Invalid token',
  TOKEN_EXPIRED: 'Token expired',
  TOKEN_USER_MISMATCH: 'Token user mismatch',
  INVALID_URL_FORMAT: 'Invalid URL format',
  INVALID_REDIRECT_URL_FORMAT: 'Invalid redirect URL format',
  ACCESS_DENIED: 'Access denied',
  SITE_NOT_FOUND: 'Site not found',
  SITE_URL_EXISTS: 'Site URL already exists',
  INVALID_INPUT_DATA: 'Invalid input data',
  VALIDATION_FAILED: 'Validation failed',
  USER_VALIDATION_FAILED: 'User validation failed',
  AUTHORIZATION_SYSTEM_ERROR: 'Authorization system error',
  FAILED_TO_FETCH_USERS: 'Failed to fetch users',
  FAILED_TO_FETCH_SITES: 'Failed to fetch sites',
  FAILED_TO_ADD_SITE: 'Failed to add site',
  FAILED_TO_UPDATE_SITE: 'Failed to update site',
  FAILED_TO_DELETE_SITE: 'Failed to delete site'
} as const

// Mock rate limit responses
export const createRateLimitResponse = (status: 'success' | 'exceeded', config?: any) => {
  if (status === 'exceeded') {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        resetTime: new Date(Date.now() + 60000).toISOString()
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": "0",
          "Retry-After": "60"
        }
      }
    )
  }
  return null // Allows request to proceed
}

// Test data sets for comprehensive testing
export const TEST_DATA = {
  VALID_SITES: [
    'https://example.com',
    'https://test-site.com',
    'https://valid-domain.net'
  ],
  INVALID_SITES: [
    'not-a-url',
    'ftp://invalid-protocol.com',
    'javascript:alert(1)',
    'http://localhost:3000/../../../etc/passwd'
  ],
  VALID_REDIRECT_URLS: [
    'https://example.com/callback',
    'https://secure-site.com/auth/callback',
    'https://app.domain.com/auth'
  ],
  INVALID_REDIRECT_URLS: [
    'not-a-url',
    'http://malicious-site.com',
    'javascript:void(0)',
    'data:text/html,<script>alert(1)</script>'
  ],
  SQL_INJECTION_ATTEMPTS: [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'/*",
    "1; DELETE FROM sites WHERE 1=1; --"
  ],
  XSS_ATTEMPTS: [
    "<script>alert('xss')</script>",
    "javascript:alert('xss')",
    "<img src=x onerror=alert('xss')>",
    "';alert('xss');//"
  ]
} as const

// Role hierarchy for testing permissions
export const ROLE_HIERARCHY = {
  [USER_ROLES.GUEST]: 0,
  [USER_ROLES.STANDARD]: 1,
  [USER_ROLES.PREMIUM]: 2,
  [USER_ROLES.ADMIN]: 3,
  [USER_ROLES.SUPER_ADMIN]: 4
} as const

// Helper to check if role has sufficient privileges
export const hasRoleAccess = (userRole: string, requiredRole: string): boolean => {
  const userLevel = ROLE_HIERARCHY[userRole as keyof typeof ROLE_HIERARCHY] || 0
  const requiredLevel = ROLE_HIERARCHY[requiredRole as keyof typeof ROLE_HIERARCHY] || 0
  return userLevel >= requiredLevel
}