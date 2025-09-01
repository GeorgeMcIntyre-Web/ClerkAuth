import { NextResponse } from 'next/server'

export async function GET() {
  // Only show in development or with a secret query param
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev && process.env.VERCEL_ENV !== 'preview') {
    return NextResponse.json({ 
      message: 'Debug endpoint disabled in production' 
    }, { status: 403 })
  }
  
  // Check which environment variables are set (not showing actual values for security)
  const envStatus = {
    clerk: {
      publishableKey: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      secretKey: !!process.env.CLERK_SECRET_KEY,
      signInUrl: !!process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL,
      signUpUrl: !!process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL,
    },
    database: {
      url: !!process.env.DATABASE_URL,
    },
    jwt: {
      secret: !!process.env.JWT_SECRET,
    },
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'not-set',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV || 'not-vercel',
    },
    optional: {
      sentryDsn: !!process.env.SENTRY_DSN,
      kvUrl: !!process.env.KV_REST_API_URL,
      kvToken: !!process.env.KV_REST_API_TOKEN,
    }
  }
  
  // Check for common issues
  const issues = []
  
  if (!envStatus.clerk.publishableKey) {
    issues.push('NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set')
  }
  if (!envStatus.clerk.secretKey) {
    issues.push('CLERK_SECRET_KEY is not set')
  }
  if (!envStatus.database.url) {
    issues.push('DATABASE_URL is not set')
  }
  if (!envStatus.jwt.secret) {
    issues.push('JWT_SECRET is not set')
  }
  
  return NextResponse.json({
    status: issues.length === 0 ? 'ok' : 'missing-config',
    environment: envStatus,
    issues,
    timestamp: new Date().toISOString()
  })
}