import jwt from 'jsonwebtoken'

// Get JWT secret with fallback for development
const getJWTSecret = (): string => {
  const secret = process.env.JWT_SECRET
  
  // In production, we need a real secret
  if (!secret && process.env.NODE_ENV === 'production') {
    console.error('JWT_SECRET is required in production but not set')
    // Return a placeholder that will make JWT operations fail gracefully
    return 'missing-jwt-secret-please-configure'
  }
  
  // In development, use a default secret
  return secret || 'dev-secret-change-in-production'
}

// Secure JWT token generation for cross-site authentication
export function generateAuthToken(userId: string, userRole: string): string {
  const secret = getJWTSecret()

  const payload = {
    userId,
    role: userRole,
    timestamp: Date.now(),
    issuer: 'nitroauth',
    audience: 'authorized-sites'
  }

  return jwt.sign(payload, secret, {
    expiresIn: '1h', // Tokens expire after 1 hour
    algorithm: 'HS256'
  })
}

export function verifyAuthToken(token: string): { userId: string; role: string; timestamp: number } | null {
  const secret = getJWTSecret()

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ['HS256']
    }) as any

    return {
      userId: decoded.userId,
      role: decoded.role,
      timestamp: decoded.timestamp
    }
  } catch (error) {
    console.error('JWT verification failed:', error)
    return null
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as any
    if (!decoded || !decoded.exp) return true
    
    const currentTime = Math.floor(Date.now() / 1000)
    return decoded.exp < currentTime
  } catch {
    return true
  }
}