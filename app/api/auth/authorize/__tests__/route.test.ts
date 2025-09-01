import { POST } from '../route'
import { auth, clerkClient } from '@clerk/nextjs/server'

// Mock the modules
jest.mock('@clerk/nextjs/server')
jest.mock('@/lib/jwt')
jest.mock('@/lib/validation')
jest.mock('@/lib/rate-limit')
jest.mock('@/lib/logger')

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockClerkClient = clerkClient as jest.Mocked<typeof clerkClient>

describe('POST /api/auth/authorize', () => {
  const mockUserId = 'user_test123'
  const mockUserEmail = 'test@example.com'
  const mockUser = {
    id: mockUserId,
    emailAddresses: [{ emailAddress: mockUserEmail }],
    publicMetadata: {
      role: 'STANDARD',
      siteAccess: ['standard_sites']
    }
  }

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock auth to return user ID
    mockAuth.mockReturnValue({ userId: mockUserId })
    
    // Mock clerkClient.users.getUser
    mockClerkClient.users.getUser.mockResolvedValue(mockUser as any)
  })

  test('should return 401 if no user ID', async () => {
    mockAuth.mockReturnValue({ userId: null })

    const request = new Request('http://localhost/api/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedSite: 'test-site',
        redirectUrl: 'https://example.com/callback'
      })
    })

    // Mock rate limiting to allow the request through
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })

    const response = await POST(request)
    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  test('should return 400 for missing required parameters', async () => {
    const request = new Request('http://localhost/api/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedSite: 'test-site'
        // missing redirectUrl
      })
    })

    // Mock rate limiting
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.error).toBe('Missing required parameters: requestedSite and redirectUrl')
  })

  test('should return 400 for invalid redirect URL', async () => {
    const request = new Request('http://localhost/api/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedSite: 'test-site',
        redirectUrl: 'not-a-valid-url'
      })
    })

    // Mock validation functions
    const mockSanitizeString = require('@/lib/validation').sanitizeString
    mockSanitizeString.mockImplementation((str: string) => str)

    // Mock rate limiting
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })

    const response = await POST(request)
    expect(response.status).toBe(400)

    const body = await response.json()
    expect(body.error).toBe('Invalid redirect URL format')
  })

  test('should return 403 for unauthorized site access', async () => {
    const request = new Request('http://localhost/api/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedSite: 'premium-site',
        redirectUrl: 'https://premium.example.com/callback'
      })
    })

    // Mock validation functions
    const mockSanitizeString = require('@/lib/validation').sanitizeString
    mockSanitizeString.mockImplementation((str: string) => str)

    // Mock rate limiting
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })

    // Mock logger
    const mockLogSecurity = require('@/lib/logger').logSecurity
    mockLogSecurity.unauthorizedAccess = jest.fn()

    const response = await POST(request)
    expect(response.status).toBe(403)

    const body = await response.json()
    expect(body.authorized).toBe(false)
    expect(body.error).toContain('Access denied')
    expect(mockLogSecurity.unauthorizedAccess).toHaveBeenCalled()
  })

  test('should successfully authorize valid request', async () => {
    const request = new Request('http://localhost/api/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedSite: 'standard-site',
        redirectUrl: 'https://standard.example.com/callback'
      })
    })

    // Mock validation functions
    const mockSanitizeString = require('@/lib/validation').sanitizeString
    mockSanitizeString.mockImplementation((str: string) => str)

    // Mock JWT generation
    const mockGenerateAuthToken = require('@/lib/jwt').generateAuthToken
    mockGenerateAuthToken.mockReturnValue('mock.jwt.token')

    // Mock rate limiting
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })

    // Mock logger
    const mockLogSecurity = require('@/lib/logger').logSecurity
    mockLogSecurity.authSuccess = jest.fn()

    // Update user metadata to have access to standard sites
    const userWithAccess = {
      ...mockUser,
      publicMetadata: {
        role: 'STANDARD',
        siteAccess: ['standard_sites', 'standard.example.com']
      }
    }
    mockClerkClient.users.getUser.mockResolvedValue(userWithAccess as any)

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.authorized).toBe(true)
    expect(body.redirectUrl).toContain('auth_token=mock.jwt.token')
    expect(body.userRole).toBe('STANDARD')
    expect(mockLogSecurity.authSuccess).toHaveBeenCalled()
  })

  test('should handle server errors gracefully', async () => {
    mockAuth.mockImplementation(() => {
      throw new Error('Database connection failed')
    })

    const request = new Request('http://localhost/api/auth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestedSite: 'test-site',
        redirectUrl: 'https://example.com/callback'
      })
    })

    // Mock rate limiting
    const mockWithRateLimit = require('@/lib/rate-limit').withRateLimit
    mockWithRateLimit.mockImplementation(async (config: any, identifier: string, handler: () => Promise<Response>) => {
      return await handler()
    })

    const response = await POST(request)
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('Authorization system error')
  })
})