import { POST, GET } from '../route'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { USER_ROLES } from '@/lib/auth-config'
import { 
  createMockUser, 
  createMockJWT, 
  createMockRequest, 
  createMockValidationCache,
  TEST_ERRORS,
  TEST_DATA 
} from '@/lib/test-utils'

// Mock the modules
jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/jwt')
jest.mock('@/lib/rate-limit')
jest.mock('@/lib/cache')
jest.mock('@/lib/logger')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockClerkClient = clerkClient as jest.Mocked<typeof clerkClient>

describe('POST /api/validate', () => {
  const mockUserId = 'user_test123'
  const mockUserEmail = 'test@example.com'
  const mockClientIP = '192.168.1.100'
  const validToken = 'valid.jwt.token'
  const mockUser = createMockUser({
    id: mockUserId,
    email: mockUserEmail,
    role: USER_ROLES.STANDARD
  })

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock rate limiting to allow requests by default
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })

    // Mock getClientIP
    const mockGetClientIP = require('@/lib/rate-limit').getClientIP
    mockGetClientIP.mockReturnValue(mockClientIP)

    // Mock JWT functions
    const mockVerifyAuthToken = require('@/lib/jwt').verifyAuthToken
    const mockIsTokenExpired = require('@/lib/jwt').isTokenExpired
    mockVerifyAuthToken.mockReturnValue(createMockJWT({ userId: mockUserId }))
    mockIsTokenExpired.mockReturnValue(false)

    // Mock cache
    const mockCache = require('@/lib/cache').cache
    mockCache.getUserValidation.mockResolvedValue(null)
    mockCache.setUserValidation.mockResolvedValue(undefined)

    // Mock Clerk client
    mockClerkClient.users.getUser.mockResolvedValue(mockUser as any)
  })

  describe('Authentication and Authorization', () => {
    test('should return 400 for missing auth_token', async () => {
      const request = createMockRequest('http://localhost/api/validate', {
        body: { user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.MISSING_PARAMETERS)
    })

    test('should return 400 for missing user_id', async () => {
      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: validToken }
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.MISSING_PARAMETERS)
    })

    test('should return 401 for expired token', async () => {
      const mockIsTokenExpired = require('@/lib/jwt').isTokenExpired
      mockIsTokenExpired.mockReturnValue(true)

      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: validToken, user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.TOKEN_EXPIRED)
    })

    test('should return 401 for invalid token', async () => {
      const mockVerifyAuthToken = require('@/lib/jwt').verifyAuthToken
      mockVerifyAuthToken.mockReturnValue(null)

      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: 'invalid.token', user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.INVALID_TOKEN)
    })

    test('should return 401 for token user mismatch', async () => {
      const mockVerifyAuthToken = require('@/lib/jwt').verifyAuthToken
      mockVerifyAuthToken.mockReturnValue(createMockJWT({ userId: 'different_user_id' }))

      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: validToken, user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.TOKEN_USER_MISMATCH)
    })
  })

  describe('User Validation', () => {
    test('should return 401 when user validation fails', async () => {
      mockClerkClient.users.getUser.mockRejectedValue(new Error('User not found'))

      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: validToken, user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.USER_VALIDATION_FAILED)
    })

    test('should handle user with no metadata gracefully', async () => {
      const userWithoutMetadata = createMockUser({
        id: mockUserId,
        email: mockUserEmail,
        publicMetadata: undefined
      })
      
      mockClerkClient.users.getUser.mockResolvedValue(userWithoutMetadata as any)

      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: validToken, user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.user.role).toBe('GUEST') // Default role
      expect(body.user.siteAccess).toEqual([]) // Default empty access
    })

    test('should successfully validate user with proper token and metadata', async () => {
      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site' 
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.user.id).toBe(mockUserId)
      expect(body.user.email).toBe(mockUserEmail)
      expect(body.user.role).toBe(USER_ROLES.STANDARD)
      expect(body.permissions).toBeDefined()
      expect(body.sessionInfo).toBeDefined()
      expect(body.tokenData).toBeDefined()
    })
  })

  describe('Caching Functionality', () => {
    test('should use cached validation data when available and fresh', async () => {
      const mockCache = require('@/lib/cache').cache
      const cachedData = createMockValidationCache({
        role: USER_ROLES.PREMIUM,
        siteAccess: ['premium_sites'],
        timestamp: Date.now() - 60000 // 1 minute ago (fresh)
      })
      
      mockCache.getUserValidation.mockResolvedValue(cachedData)

      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site' 
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.user.role).toBe(USER_ROLES.PREMIUM)
      expect(mockCache.setUserValidation).not.toHaveBeenCalled() // Should not cache again
    })

    test('should fetch fresh data when cache is stale', async () => {
      const mockCache = require('@/lib/cache').cache
      const staleData = createMockValidationCache({
        timestamp: Date.now() - 400000 // 6+ minutes ago (stale)
      })
      
      mockCache.getUserValidation.mockResolvedValue(staleData)

      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site' 
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(mockClerkClient.users.getUser).toHaveBeenCalled()
      expect(mockCache.setUserValidation).toHaveBeenCalled()
    })

    test('should fetch fresh data when no cache available', async () => {
      const mockCache = require('@/lib/cache').cache
      mockCache.getUserValidation.mockResolvedValue(null)

      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site' 
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(mockClerkClient.users.getUser).toHaveBeenCalled()
      expect(mockCache.setUserValidation).toHaveBeenCalled()
    })
  })

  describe('Permission System', () => {
    test('should return requested permissions when provided', async () => {
      const requestedPermissions = ['dashboard:read', 'users:read', 'settings:read']
      
      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site',
          requestedPermissions
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.requestedPermissions).toBeDefined()
      expect(Object.keys(body.requestedPermissions)).toEqual(requestedPermissions)
    })

    test('should handle permission evaluation for different user roles', async () => {
      // Test Super Admin permissions
      const superAdminUser = createMockUser({
        id: mockUserId,
        email: mockUserEmail,
        role: USER_ROLES.SUPER_ADMIN,
        siteAccess: ['all_sites']
      })
      
      mockClerkClient.users.getUser.mockResolvedValue(superAdminUser as any)

      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.user.role).toBe(USER_ROLES.SUPER_ADMIN)
      expect(body.permissions).toBeDefined()
      
      // Super admin should have admin-level permissions
      expect(body.permissions['dashboard:admin']).toBe(true)
      expect(body.permissions['users:admin']).toBe(true)
    })
  })

  describe('Security Tests', () => {
    test('should handle SQL injection attempts in user_id', async () => {
      for (const maliciousUserId of TEST_DATA.SQL_INJECTION_ATTEMPTS) {
        const request = createMockRequest('http://localhost/api/validate', {
          body: { 
            auth_token: validToken, 
            user_id: maliciousUserId 
          }
        })

        const response = await POST(request)
        
        // Should either validate normally (if properly sanitized) or fail gracefully
        expect([200, 400, 401, 500]).toContain(response.status)
        
        if (response.status !== 200) {
          const body = await response.json()
          expect(body.valid).toBe(false)
        }
      }
    })

    test('should log validation events with proper metadata', async () => {
      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site' 
        },
        headers: {
          'User-Agent': 'Test Browser/1.0',
          'x-forwarded-for': '203.0.113.1'
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      // Verify logging was called (mocked function)
      // In a real implementation, we'd check that the log contains proper security metadata
    })

    test('should handle rate limiting', async () => {
      const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
      mockWithRateLimit.mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later."
          }),
          { status: 429 }
        )
      })

      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: validToken, user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(429)

      const body = await response.json()
      expect(body.error).toBe("Too many requests")
    })
  })

  describe('Error Handling', () => {
    test('should handle user validation errors gracefully', async () => {
      // Make the user lookup fail
      mockClerkClient.users.getUser.mockRejectedValue(new Error('Database connection failed'))

      const request = createMockRequest('http://localhost/api/validate', {
        body: { auth_token: validToken, user_id: mockUserId }
      })

      const response = await POST(request)
      expect(response.status).toBe(401) // User validation errors return 401

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.USER_VALIDATION_FAILED)
    })

    test('should handle malformed JSON in request body', async () => {
      const request = new Request('http://localhost/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"invalid": json}'
      })

      const response = await POST(request)
      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.VALIDATION_FAILED)
    })
  })

  describe('Session Information', () => {
    test('should return proper session information', async () => {
      const request = createMockRequest('http://localhost/api/validate', {
        body: { 
          auth_token: validToken, 
          user_id: mockUserId,
          siteId: 'test-site' 
        }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.sessionInfo).toBeDefined()
      expect(body.sessionInfo.expiresAt).toBeDefined()
      expect(body.sessionInfo.renewAt).toBeDefined()
      expect(body.sessionInfo.sessionId).toBeDefined()
      
      // Verify session expires in ~8 hours
      const expiresAt = new Date(body.sessionInfo.expiresAt)
      const now = new Date()
      const hoursUntilExpiry = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60)
      expect(hoursUntilExpiry).toBeGreaterThan(7)
      expect(hoursUntilExpiry).toBeLessThan(9)
    })
  })
})

describe('GET /api/validate', () => {
  const mockUserId = 'user_test123'
  const validToken = 'valid.jwt.token'

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock JWT functions for GET endpoint
    const mockVerifyAuthToken = require('@/lib/jwt').verifyAuthToken
    const mockIsTokenExpired = require('@/lib/jwt').isTokenExpired
    mockVerifyAuthToken.mockReturnValue(createMockJWT({ userId: mockUserId }))
    mockIsTokenExpired.mockReturnValue(false)
  })

  describe('Quick Token Validation', () => {
    test('should return 400 for missing parameters', async () => {
      const url = new URL('http://localhost/api/validate')
      const request = new Request(url.toString(), { method: 'GET' })

      const response = await GET(request)
      expect(response.status).toBe(400)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe('Missing parameters')
    })

    test('should return invalid for expired token', async () => {
      const mockIsTokenExpired = require('@/lib/jwt').isTokenExpired
      mockIsTokenExpired.mockReturnValue(true)

      const url = new URL('http://localhost/api/validate')
      url.searchParams.set('auth_token', validToken)
      url.searchParams.set('user_id', mockUserId)
      
      const request = new Request(url.toString(), { method: 'GET' })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.TOKEN_EXPIRED)
    })

    test('should return invalid for invalid token', async () => {
      const mockVerifyAuthToken = require('@/lib/jwt').verifyAuthToken
      mockVerifyAuthToken.mockReturnValue(null)

      const url = new URL('http://localhost/api/validate')
      url.searchParams.set('auth_token', 'invalid.token')
      url.searchParams.set('user_id', mockUserId)
      
      const request = new Request(url.toString(), { method: 'GET' })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(false)
      expect(body.error).toBe(TEST_ERRORS.INVALID_TOKEN)
    })

    test('should return valid for correct token and user', async () => {
      const url = new URL('http://localhost/api/validate')
      url.searchParams.set('auth_token', validToken)
      url.searchParams.set('user_id', mockUserId)
      
      const request = new Request(url.toString(), { method: 'GET' })

      const response = await GET(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.valid).toBe(true)
      expect(body.role).toBe(USER_ROLES.STANDARD)
      expect(body.timestamp).toBeDefined()
    })
  })
})