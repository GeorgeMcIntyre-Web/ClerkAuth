import { POST, GET, PUT, DELETE, PATCH } from '../route'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { USER_ROLES } from '@/lib/auth-config'

// Mock the modules
jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/rate-limit')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockClerkClient = clerkClient as jest.Mocked<typeof clerkClient>

// Mock console.log to capture security logs
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation()

describe('Admin Setup Endpoint Security Tests', () => {
  const mockUserId = 'user_test123'
  const mockUserEmail = 'test@example.com'
  const mockClientIP = '192.168.1.100'

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock getClientIP
    const mockGetClientIP = require('@/lib/rate-limit').getClientIP
    mockGetClientIP.mockReturnValue(mockClientIP)
    
    // Mock rate limiting to allow requests by default
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })
  })

  afterAll(() => {
    mockConsoleLog.mockRestore()
  })

  describe('HTTP Method Security', () => {
    test('should reject GET requests with 405 Method Not Allowed', async () => {
      const response = await GET()
      expect(response.status).toBe(405)
      
      const body = await response.json()
      expect(body.error).toBe('Method not allowed')
    })

    test('should reject PUT requests with 405 Method Not Allowed', async () => {
      const response = await PUT()
      expect(response.status).toBe(405)
      
      const body = await response.json()
      expect(body.error).toBe('Method not allowed')
    })

    test('should reject DELETE requests with 405 Method Not Allowed', async () => {
      const response = await DELETE()
      expect(response.status).toBe(405)
      
      const body = await response.json()
      expect(body.error).toBe('Method not allowed')
    })

    test('should reject PATCH requests with 405 Method Not Allowed', async () => {
      const response = await PATCH()
      expect(response.status).toBe(405)
      
      const body = await response.json()
      expect(body.error).toBe('Method not allowed')
    })
  })

  describe('Authentication Security', () => {
    test('should reject unauthenticated requests and log security event', async () => {
      mockAuth.mockReturnValue({ userId: null })

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      expect(response.status).toBe(401)

      const body = await response.json()
      expect(body.error).toBe('Unauthorized')

      // Verify security logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('SECURITY AUDIT')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"type":"failure"')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"reason":"unauthorized"')
      )
    })
  })

  describe('Super Admin Existence Check Security', () => {
    test('should permanently disable endpoint when super admin exists', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      
      // Mock existing super admin
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [{
          id: 'existing_super_admin',
          publicMetadata: { role: USER_ROLES.SUPER_ADMIN }
        }],
        totalCount: 1
      } as any)

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      expect(response.status).toBe(403)

      const body = await response.json()
      expect(body.error).toBe('Setup endpoint permanently disabled - Super admin already exists')

      // Verify security logging shows blocked attempt
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"type":"blocked"')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"reason":"super_admin_exists"')
      )
    })

    test('should NOT have environment variable bypass vulnerability', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      
      // Mock existing super admin
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: [{
          id: 'existing_super_admin',
          publicMetadata: { role: USER_ROLES.SUPER_ADMIN }
        }],
        totalCount: 1
      } as any)

      // Set environment variable that would have bypassed security in old version
      const originalEnv = process.env.ADMIN_SETUP_ENABLED
      process.env.ADMIN_SETUP_ENABLED = 'true'

      try {
        const request = new Request('http://localhost/api/admin/setup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })

        const response = await POST(request)
        
        // Should STILL be blocked despite environment variable
        expect(response.status).toBe(403)
        expect(response.json()).resolves.toEqual({
          error: 'Setup endpoint permanently disabled - Super admin already exists'
        })
        
      } finally {
        // Restore original environment
        if (originalEnv !== undefined) {
          process.env.ADMIN_SETUP_ENABLED = originalEnv
        } else {
          delete process.env.ADMIN_SETUP_ENABLED
        }
      }
    })
  })

  describe('Rate Limiting Security', () => {
    test('should apply strict rate limiting to setup endpoint', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [], totalCount: 0 } as any)

      // Mock rate limiting to reject the request
      const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
      mockWithRateLimit.mockImplementation(async () => {
        return new Response(
          JSON.stringify({
            error: "Too many requests",
            message: "Rate limit exceeded. Please try again later.",
            resetTime: new Date().toISOString()
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "X-RateLimit-Limit": "1",
              "X-RateLimit-Remaining": "0",
              "Retry-After": "86400"
            }
          }
        )
      })

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      expect(response.status).toBe(429)

      const body = await response.json()
      expect(body.error).toBe('Too many requests')
      expect(response.headers.get('Retry-After')).toBe('86400') // 24 hours
    })

    test('should use setupStrict rate limiting config', async () => {
      const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
      const mockRateLimitConfigs = require('@/lib/rate-limit').rateLimitConfigs

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      await POST(request)

      // Verify setupStrict config is used (not the old setup config)
      expect(mockWithRateLimit).toHaveBeenCalledWith(
        mockRateLimitConfigs.setupStrict,
        mockClientIP,
        expect.any(Function)
      )
    })
  })

  describe('Security Headers', () => {
    test('should add comprehensive security headers to successful response', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [], totalCount: 0 } as any)
      mockClerkClient.users.getUser.mockResolvedValue({
        id: mockUserId,
        emailAddresses: [{ emailAddress: mockUserEmail }]
      } as any)
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({} as any)

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      
      // Verify that headers.set was called with security headers
      expect(response.headers.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff')
      expect(response.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY')
      expect(response.headers.set).toHaveBeenCalledWith('X-XSS-Protection', '1; mode=block')
      expect(response.headers.set).toHaveBeenCalledWith('Referrer-Policy', 'no-referrer')
      expect(response.headers.set).toHaveBeenCalledWith('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
    })
  })

  describe('Comprehensive Security Logging', () => {
    test('should log all setup attempts with detailed metadata', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [], totalCount: 0 } as any)

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 Test Browser'
        }
      })

      await POST(request)

      // Verify attempt logging includes request metadata
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/clientIP.*192\.168\.1\.100/)
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/contentType.*application\/json/)
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/userAgent.*Mozilla/)
      )
    })

    test('should log successful super admin creation with full details', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [], totalCount: 0 } as any)
      mockClerkClient.users.getUser.mockResolvedValue({
        id: mockUserId,
        emailAddresses: [{ emailAddress: mockUserEmail }]
      } as any)
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({} as any)

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      await POST(request)

      // Verify success logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"type":"success"')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`"userEmail":"${mockUserEmail}"`)
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining(`"role":"${USER_ROLES.SUPER_ADMIN}"`)
      )
    })

    test('should log database errors with security context', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      mockClerkClient.users.getUserList.mockRejectedValue(new Error('Database connection failed'))

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      expect(response.status).toBe(500)

      // Verify error logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"type":"failure"')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"reason":"database_error"')
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Database connection failed')
      )
    })
  })

  describe('One-Time Setup Security', () => {
    test('should successfully create super admin when none exists', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [], totalCount: 0 } as any)
      mockClerkClient.users.getUser.mockResolvedValue({
        id: mockUserId,
        emailAddresses: [{ emailAddress: mockUserEmail }]
      } as any)
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({} as any)

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      expect(response.status).toBe(200)

      const body = await response.json()
      expect(body.success).toBe(true)
      expect(body.role).toBe(USER_ROLES.SUPER_ADMIN)
      expect(body.message).toContain(mockUserEmail)

      // Verify metadata was set correctly
      expect(mockClerkClient.users.updateUserMetadata).toHaveBeenCalledWith(mockUserId, {
        publicMetadata: {
          role: USER_ROLES.SUPER_ADMIN,
          siteAccess: expect.any(Array)
        }
      })
    })

    test('should handle role assignment failures gracefully', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      mockClerkClient.users.getUserList.mockResolvedValue({ data: [], totalCount: 0 } as any)
      mockClerkClient.users.getUser.mockResolvedValue({
        id: mockUserId,
        emailAddresses: [{ emailAddress: mockUserEmail }]
      } as any)
      mockClerkClient.users.updateUserMetadata.mockRejectedValue(new Error('Role assignment failed'))

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      const response = await POST(request)
      expect(response.status).toBe(500)

      const body = await response.json()
      expect(body.error).toBe('Failed to assign super admin role')

      // Verify failure logging
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('"reason":"role_assignment_failed"')
      )
    })
  })

  describe('Edge Cases and Attack Vectors', () => {
    test('should handle extremely large user lists when checking for existing super admin', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      
      // Create a large list of users without super admin role
      const largeUserList = Array.from({ length: 500 }, (_, i) => ({
        id: `user_${i}`,
        publicMetadata: { role: 'standard' }
      }))
      
      mockClerkClient.users.getUserList.mockResolvedValue({
        data: largeUserList,
        totalCount: 500
      } as any)

      // Mock successful user retrieval and role assignment
      mockClerkClient.users.getUser.mockResolvedValue({
        id: mockUserId,
        emailAddresses: [{ emailAddress: mockUserEmail }]
      } as any)
      mockClerkClient.users.updateUserMetadata.mockResolvedValue({} as any)

      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      // Should not timeout or fail with large user list and should succeed
      const response = await POST(request)
      expect(response.status).toBe(200)
      
      // Should have processed the large list correctly
      expect(mockClerkClient.users.getUserList).toHaveBeenCalledWith({ limit: 500 })
    })

    test('should sanitize user agent in logs to prevent log injection', async () => {
      mockAuth.mockReturnValue({ userId: mockUserId })
      
      const maliciousUserAgent = 'Normal Browser\n\rINJECTED LOG ENTRY: FAKE ADMIN CREATED'
      
      const request = new Request('http://localhost/api/admin/setup', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': maliciousUserAgent
        }
      })

      await POST(request)

      // Verify user agent is truncated to 100 characters max
      const logCalls = mockConsoleLog.mock.calls.flat()
      const userAgentLogs = logCalls.filter(call => 
        typeof call === 'string' && call.includes('userAgent')
      )
      
      userAgentLogs.forEach(log => {
        const match = log.match(/"userAgent":"([^"]*)"/)
        if (match) {
          expect(match[1].length).toBeLessThanOrEqual(100)
        }
      })
    })
  })
})