import { z } from 'zod'
import { USER_ROLES, SITE_PERMISSIONS } from './auth-config'

// Validation schemas for API requests
export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  role: z.enum(Object.values(USER_ROLES) as [string, ...string[]], {
    errorMap: () => ({ message: 'Invalid role specified' })
  })
})

export const updateUserAccessSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  siteAccess: z.array(
    z.enum(Object.values(SITE_PERMISSIONS) as [string, ...string[]], {
      errorMap: () => ({ message: 'Invalid site permission specified' })
    })
  ).max(20, 'Too many permissions specified')
})

export const siteAccessRequestSchema = z.object({
  requestedSite: z.string().url('Invalid site URL')
})

// Sanitize string inputs to prevent XSS
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return ''
  
  return input
    .replace(/[<>\"']/g, '') // Remove dangerous HTML characters
    .trim()
    .substring(0, 1000) // Limit length
}

// Validate and sanitize user ID (should be Clerk format)
export function validateUserId(userId: string): string {
  const sanitized = sanitizeString(userId)
  
  // Clerk user IDs typically start with 'user_' 
  if (!sanitized.startsWith('user_') || sanitized.length < 10 || sanitized.length > 50) {
    throw new Error('Invalid user ID format')
  }
  
  return sanitized
}

// Rate limiting helper
export function createRateLimitKey(identifier: string, action: string): string {
  return `ratelimit:${action}:${identifier}`
}

export type ValidatedUpdateRoleRequest = z.infer<typeof updateUserRoleSchema>
export type ValidatedUpdateAccessRequest = z.infer<typeof updateUserAccessSchema>
export type ValidatedSiteAccessRequest = z.infer<typeof siteAccessRequestSchema>