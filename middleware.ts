import { clerkMiddleware } from '@clerk/nextjs/server'

// Use the default Clerk middleware
// It will automatically handle authentication based on environment variables
export default clerkMiddleware()

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
}