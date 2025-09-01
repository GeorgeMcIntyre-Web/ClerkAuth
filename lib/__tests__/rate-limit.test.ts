import { withRateLimit, rateLimitConfigs, getClientIP } from '../rate-limit'

// Mock Request object
const createMockRequest = (headers: Record<string, string> = {}) => {
  return {
    headers: {
      get: (key: string) => headers[key] || null
    }
  } as Request
}

describe('Rate Limiting', () => {
  describe('getClientIP', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1'
      })
      expect(getClientIP(request)).toBe('192.168.1.1')
    })

    test('should extract IP from x-real-ip header', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.2'
      })
      expect(getClientIP(request)).toBe('192.168.1.2')
    })

    test('should fallback to localhost', () => {
      const request = createMockRequest()
      expect(getClientIP(request)).toBe('127.0.0.1')
    })

    test('should prefer x-forwarded-for over x-real-ip', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '192.168.1.2'
      })
      expect(getClientIP(request)).toBe('192.168.1.1')
    })
  })

  describe('withRateLimit', () => {
    test('should allow requests within limit', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response('success', { status: 200 })
      )

      const response = await withRateLimit(
        rateLimitConfigs.validate,
        'test-ip-1',
        mockHandler
      )

      expect(response.status).toBe(200)
      expect(mockHandler).toHaveBeenCalled()
    })

    test('should block requests exceeding limit', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response('success', { status: 200 })
      )

      // Make requests up to the limit
      for (let i = 0; i < rateLimitConfigs.validate.requests; i++) {
        await withRateLimit(rateLimitConfigs.validate, 'test-ip-2', mockHandler)
      }

      // Next request should be rate limited
      const response = await withRateLimit(
        rateLimitConfigs.validate,
        'test-ip-2',
        mockHandler
      )

      expect(response.status).toBe(429)
      
      const body = await response.json()
      expect(body.error).toBe('Too many requests')
    })

    test('should add rate limit headers to responses', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response('success', { status: 200 })
      )

      const response = await withRateLimit(
        rateLimitConfigs.validate,
        'test-ip-3',
        mockHandler
      )

      expect(response.headers.get('X-RateLimit-Limit')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy()
      expect(response.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })
  })

  describe('rateLimitConfigs', () => {
    test('should have valid configuration for auth endpoints', () => {
      expect(rateLimitConfigs.auth.requests).toBe(10)
      expect(rateLimitConfigs.auth.windowMs).toBe(60000) // 1 minute
    })

    test('should have higher limits for validate endpoint', () => {
      expect(rateLimitConfigs.validate.requests).toBe(100)
      expect(rateLimitConfigs.validate.requests).toBeGreaterThan(rateLimitConfigs.auth.requests)
    })

    test('should have strict limits for setup endpoint', () => {
      expect(rateLimitConfigs.setup.requests).toBe(1)
      expect(rateLimitConfigs.setup.windowMs).toBe(3600000) // 1 hour
    })
  })
})