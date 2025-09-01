import { generateAuthToken, verifyAuthToken, isTokenExpired } from '../jwt'

describe('JWT Utilities', () => {
  const mockUserId = 'user_test123'
  const mockRole = 'STANDARD'

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret-key'
  })

  describe('generateAuthToken', () => {
    test('should generate a valid token', () => {
      const token = generateAuthToken(mockUserId, mockRole)
      expect(token).toBeTruthy()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })

    test('should include correct payload data', () => {
      const token = generateAuthToken(mockUserId, mockRole)
      const payload = verifyAuthToken(token)
      
      expect(payload).toBeTruthy()
      expect(payload.userId).toBe(mockUserId)
      expect(payload.role).toBe(mockRole)
      expect(payload.timestamp).toBeTruthy()
    })
  })

  describe('verifyAuthToken', () => {
    test('should verify valid token', () => {
      const token = generateAuthToken(mockUserId, mockRole)
      const payload = verifyAuthToken(token)
      
      expect(payload).toBeTruthy()
      expect(payload.userId).toBe(mockUserId)
      expect(payload.role).toBe(mockRole)
    })

    test('should return null for invalid token', () => {
      const payload = verifyAuthToken('invalid.token.here')
      expect(payload).toBeNull()
    })

    test('should return null for malformed token', () => {
      const payload = verifyAuthToken('not-a-jwt')
      expect(payload).toBeNull()
    })
  })

  describe('isTokenExpired', () => {
    test('should return false for fresh token', () => {
      const token = generateAuthToken(mockUserId, mockRole)
      expect(isTokenExpired(token)).toBe(false)
    })

    test('should return true for invalid token', () => {
      expect(isTokenExpired('invalid.token')).toBe(true)
    })

    test('should return true for malformed token', () => {
      expect(isTokenExpired('not-a-jwt')).toBe(true)
    })
  })
})