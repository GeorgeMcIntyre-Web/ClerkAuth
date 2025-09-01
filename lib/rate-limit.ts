// Simple in-memory rate limiter for development/small scale
// In production, replace with Redis-based solution

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  const keys = Array.from(rateLimitStore.keys())
  for (const key of keys) {
    const entry = rateLimitStore.get(key)
    if (entry && entry.resetTime <= now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean every minute

export interface RateLimitConfig {
  requests: number
  windowMs: number
}

export const rateLimitConfigs = {
  auth: { requests: 10, windowMs: 60000 }, // 10 requests per minute
  validate: { requests: 100, windowMs: 60000 }, // 100 requests per minute  
  admin: { requests: 30, windowMs: 60000 }, // 30 requests per minute
  setup: { requests: 1, windowMs: 3600000 }, // 1 request per hour (legacy)
  setupStrict: { requests: 1, windowMs: 86400000 }, // 1 request per day (24 hours) for admin setup
}

// Helper function to get client IP
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  // Fallback for local development
  return "127.0.0.1"
}

// Check rate limit for identifier
function checkRateLimit(identifier: string, config: RateLimitConfig) {
  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)
  
  if (!entry || entry.resetTime <= now) {
    // Create or reset entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.windowMs
    }
    rateLimitStore.set(key, newEntry)
    return {
      success: true,
      limit: config.requests,
      remaining: config.requests - 1,
      reset: newEntry.resetTime
    }
  }
  
  if (entry.count >= config.requests) {
    return {
      success: false,
      limit: config.requests,
      remaining: 0,
      reset: entry.resetTime
    }
  }
  
  entry.count++
  rateLimitStore.set(key, entry)
  
  return {
    success: true,
    limit: config.requests,
    remaining: config.requests - entry.count,
    reset: entry.resetTime
  }
}

// Rate limit middleware wrapper
export async function withRateLimit(
  config: RateLimitConfig,
  identifier: string,
  handler: () => Promise<Response>
): Promise<Response> {
  const result = checkRateLimit(identifier, config)
  
  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "Too many requests",
        message: "Rate limit exceeded. Please try again later.",
        resetTime: new Date(result.reset).toISOString()
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": result.limit.toString(),
          "X-RateLimit-Remaining": result.remaining.toString(),
          "X-RateLimit-Reset": result.reset.toString(),
          "Retry-After": Math.round((result.reset - Date.now()) / 1000).toString()
        }
      }
    )
  }
  
  const response = await handler()
  
  // Add rate limit headers to successful responses
  response.headers.set("X-RateLimit-Limit", result.limit.toString())
  response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
  response.headers.set("X-RateLimit-Reset", result.reset.toString())
  
  return response
}