import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

// Wrap Clerk middleware with error handling
const middleware = clerkMiddleware()

export default function middlewareWrapper(req: any) {
  try {
    // Check if Clerk is properly configured
    if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) {
      console.warn('Clerk environment variables not configured')
      // Allow request to proceed but log warning
      return NextResponse.next()
    }
    
    return middleware(req)
  } catch (error) {
    console.error('Middleware error:', error)
    // Allow request to proceed even if middleware fails
    return NextResponse.next()
  }
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}