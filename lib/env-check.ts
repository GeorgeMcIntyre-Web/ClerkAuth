// Environment variable validation for Vercel deployment
const requiredEnvVars = {
  // Clerk Authentication
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  
  // Database
  DATABASE_URL: process.env.DATABASE_URL,
  
  // JWT Secret
  JWT_SECRET: process.env.JWT_SECRET,
  
  // App URL
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000',
}

const optionalEnvVars = {
  // Sentry
  SENTRY_DSN: process.env.SENTRY_DSN,
  
  // Vercel KV Cache
  KV_REST_API_URL: process.env.KV_REST_API_URL,
  KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN,
  
  // Upstash Redis (for rate limiting)
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
}

export function checkEnvVars() {
  const missing: string[] = []
  
  // Check required variables
  for (const [key, value] of Object.entries(requiredEnvVars)) {
    if (!value && key !== 'NEXT_PUBLIC_APP_URL') {
      missing.push(key)
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:')
    missing.forEach(key => console.error(`   - ${key}`))
    
    // Only throw in production
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
    } else {
      console.warn('⚠️  Running in development mode with missing environment variables')
    }
  }
  
  // Log optional variables status
  const missingOptional = Object.entries(optionalEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key)
  
  if (missingOptional.length > 0) {
    console.warn('⚠️  Optional environment variables not set:')
    missingOptional.forEach(key => console.warn(`   - ${key}`))
  }
  
  return {
    required: requiredEnvVars,
    optional: optionalEnvVars,
    missing,
    missingOptional,
  }
}

// Get environment-aware configuration
export function getEnvConfig() {
  const isProduction = process.env.NODE_ENV === 'production'
  const isVercel = process.env.VERCEL === '1'
  const isPreview = process.env.VERCEL_ENV === 'preview'
  
  return {
    isProduction,
    isVercel,
    isPreview,
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 
            (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
    databaseUrl: process.env.DATABASE_URL,
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
  }
}