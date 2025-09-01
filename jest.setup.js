import '@testing-library/jest-dom'

// Polyfills for Node.js environment
global.TextDecoder = require('util').TextDecoder
global.TextEncoder = require('util').TextEncoder

// Use built-in fetch APIs
if (typeof globalThis.Request === 'undefined') {
  globalThis.Request = class Request {
    constructor(input, options = {}) {
      this.url = input
      this.method = options.method || 'GET'
      this.body = options.body || null
      
      // Create a headers object with get method
      const headerEntries = Object.entries(options.headers || {})
      this.headers = {
        get: (name) => {
          const entry = headerEntries.find(([key]) => 
            key.toLowerCase() === name.toLowerCase()
          )
          return entry ? entry[1] : null
        },
        set: (name, value) => {
          // Not implemented for tests
        }
      }
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body))
    }
  }
}

if (typeof globalThis.Response === 'undefined') {
  globalThis.Response = class Response {
    constructor(body, options = {}) {
      this.body = body
      this.status = options.status || 200
      this.statusText = options.statusText || 'OK'
      
      const headerEntries = Object.entries(options.headers || {})
      this.headers = {
        get: (name) => {
          const entry = headerEntries.find(([key]) => 
            key.toLowerCase() === name.toLowerCase()
          )
          return entry ? entry[1] : null
        },
        set: (name, value) => {
          const existingIndex = headerEntries.findIndex(([key]) => 
            key.toLowerCase() === name.toLowerCase()
          )
          if (existingIndex !== -1) {
            headerEntries[existingIndex] = [name, value]
          } else {
            headerEntries.push([name, value])
          }
        }
      }
    }
    
    json() {
      return Promise.resolve(JSON.parse(this.body))
    }
  }
}

// Mock Clerk
jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
  clerkClient: {
    users: {
      getUser: jest.fn(),
      getUserList: jest.fn(),
      updateUserMetadata: jest.fn(),
    },
  },
}))

// Mock Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
  useSearchParams: jest.fn(),
}))

// Mock NextResponse
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options = {}) => {
      const mockResponse = {
        status: options.status || 200,
        json: jest.fn().mockResolvedValue(data),
        headers: {
          get: jest.fn(),
          set: jest.fn()
        }
      }
      return mockResponse
    })
  }
}))

// Mock environment variables
process.env.JWT_SECRET = 'test-secret'
process.env.NODE_ENV = 'test'
process.env.KV_REST_API_URL = 'test-kv-url'

// Mock Vercel KV
jest.mock('@vercel/kv', () => ({
  kv: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn()
  }
}))

// Mock Winston logger
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    add: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    json: jest.fn(),
    colorize: jest.fn(),
    simple: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn()
  }
}))

// Mock Sentry
jest.mock('@sentry/nextjs', () => ({
  captureException: jest.fn(),
  captureMessage: jest.fn()
}))

// Mock JWT
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn()
}))

// Mock database modules
jest.mock('@/lib/db', () => ({
  db: jest.fn()
}))

// Mock Neon database
jest.mock('@neondatabase/serverless', () => ({
  neon: jest.fn(),
  neonConfig: {}
}))

// Mock Drizzle ORM
jest.mock('drizzle-orm/neon-http', () => ({
  drizzle: jest.fn()
}))

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
  or: jest.fn(),
  relations: jest.fn()
}))

// Mock the cache module
jest.mock('@/lib/cache', () => ({
  cache: {
    getUserValidation: jest.fn(),
    setUserValidation: jest.fn(),
    getUserPermissions: jest.fn(),
    setUserPermissions: jest.fn(),
    getSiteConfig: jest.fn(),
    setSiteConfig: jest.fn(),
    getSystemConfig: jest.fn(),
    setSystemConfig: jest.fn(),
    invalidateUser: jest.fn(),
    invalidateUserPermissions: jest.fn(),
    invalidateSite: jest.fn()
  },
  withCache: jest.fn()
}))

// Mock logger functions
jest.mock('@/lib/logger', () => ({
  log: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  },
  logSecurity: {
    unauthorizedAccess: jest.fn(),
    authSuccess: jest.fn(),
    adminAction: jest.fn(),
    rateLimitHit: jest.fn(),
    suspiciousActivity: jest.fn()
  },
  logApi: {
    request: jest.fn(),
    response: jest.fn()
  },
  logDatabase: {
    query: jest.fn()
  },
  LogCategory: {
    AUTH: 'auth',
    ADMIN: 'admin',
    SECURITY: 'security',
    API: 'api',
    DATABASE: 'database',
    RATE_LIMIT: 'rate_limit',
    SYSTEM: 'system'
  },
  LogLevel: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  }
}))

// Mock validation functions
jest.mock('@/lib/validation', () => ({
  sanitizeString: jest.fn((str) => str),
  validateUserId: jest.fn((id) => id),
  createRateLimitKey: jest.fn((identifier, action) => `ratelimit:${action}:${identifier}`),
  updateUserRoleSchema: { safeParse: jest.fn() },
  updateUserAccessSchema: { safeParse: jest.fn() },
  siteAccessRequestSchema: { safeParse: jest.fn() }
}))

// Mock rate limiting functions
jest.mock('@/lib/rate-limit', () => ({
  withRateLimit: jest.fn((config, identifier, handler) => handler()),
  getClientIP: jest.fn(() => '192.168.1.100'),
  rateLimitConfigs: {
    auth: { requests: 10, windowMs: 60000 },
    validate: { requests: 100, windowMs: 60000 },
    admin: { requests: 30, windowMs: 60000 },
    setup: { requests: 1, windowMs: 3600000 },
    setupStrict: { requests: 1, windowMs: 86400000 }
  }
}))

// Mock JWT functions
jest.mock('@/lib/jwt', () => ({
  generateAuthToken: jest.fn(() => 'mock.jwt.token'),
  verifyAuthToken: jest.fn(),
  isTokenExpired: jest.fn(() => false)
}))

// Mock Drizzle Zod functions
jest.mock('drizzle-zod', () => ({
  createInsertSchema: jest.fn(() => ({
    safeParse: jest.fn().mockReturnValue({ success: true, data: {} }),
    partial: jest.fn().mockReturnValue({
      omit: jest.fn().mockReturnValue({
        safeParse: jest.fn().mockReturnValue({ success: true, data: {} })
      })
    })
  })),
  createSelectSchema: jest.fn(() => ({}))
}))