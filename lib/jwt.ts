import jwt from 'jsonwebtoken'

// Secure JWT token generation for cross-site authentication
export function generateAuthToken(userId: string, userRole: string): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  const payload = {
    userId,
    role: userRole,
    timestamp: Date.now(),
    issuer: 'nitroauth',
    audience: 'authorized-sites'
  }

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h', // Tokens expire after 1 hour
    algorithm: 'HS256'
  })
}

export function verifyAuthToken(token: string): { userId: string; role: string; timestamp: number } | null {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
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