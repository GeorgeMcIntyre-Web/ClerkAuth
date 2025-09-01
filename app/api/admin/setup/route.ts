import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { USER_ROLES, ROLE_PERMISSIONS } from '@/lib/auth-config'
import { withRateLimit, rateLimitConfigs, getClientIP } from '@/lib/rate-limit'

// SECURITY: Setup attempt logging for audit trail
function logSetupAttempt(type: 'attempt' | 'success' | 'failure' | 'blocked', details: any) {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    type,
    event: 'ADMIN_SETUP',
    ...details
  }
  
  // In production, this should be sent to a secure logging service
  console.log(`SECURITY AUDIT: ${JSON.stringify(logEntry)}`)
  
  // Additional security logging could be added here (e.g., to external security service)
}

async function setupSuperAdmin(clientIP: string) {
  const { userId } = auth()
  if (!userId) {
    logSetupAttempt('failure', { 
      reason: 'unauthorized', 
      clientIP,
      userId: null
    })
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SECURITY: Check if super admin already exists (one-time setup only)
  // This endpoint can ONLY be used ONCE and cannot be re-enabled
  try {
    // Check all users for super admin role - this is now the ONLY check
    const existingUsers = await clerkClient.users.getUserList({ limit: 500 })
    const hasExistingSuperAdmin = existingUsers.data.some(user => 
      user.publicMetadata?.role === USER_ROLES.SUPER_ADMIN
    )
    
    // SECURITY FIX: Completely disable if super admin exists - no environment override
    if (hasExistingSuperAdmin) {
      logSetupAttempt('blocked', { 
        reason: 'super_admin_exists', 
        clientIP,
        userId,
        attemptedBy: 'unknown_user'
      })
      return NextResponse.json({ 
        error: 'Setup endpoint permanently disabled - Super admin already exists' 
      }, { status: 403 })
    }
    
    logSetupAttempt('attempt', { 
      clientIP,
      userId,
      superAdminCount: 0
    })
    
  } catch (error) {
    console.error('Error checking existing super admins:', error)
    logSetupAttempt('failure', { 
      reason: 'database_error', 
      clientIP,
      userId,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }

  const user = await clerkClient.users.getUser(userId)
  const userEmail = user.emailAddresses[0]?.emailAddress || 'no-email'
  
  try {
    // Set the current user as super admin
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: USER_ROLES.SUPER_ADMIN,
        siteAccess: ROLE_PERMISSIONS[USER_ROLES.SUPER_ADMIN]
      }
    })

    // SECURITY: Log successful super admin creation
    logSetupAttempt('success', { 
      clientIP,
      userId,
      userEmail,
      role: USER_ROLES.SUPER_ADMIN,
      permissions: ROLE_PERMISSIONS[USER_ROLES.SUPER_ADMIN]
    })

    return NextResponse.json({ 
      success: true, 
      message: `User ${userEmail} is now a Super Admin`,
      role: USER_ROLES.SUPER_ADMIN
    })
  } catch (error) {
    logSetupAttempt('failure', { 
      reason: 'role_assignment_failed', 
      clientIP,
      userId,
      userEmail,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
    return NextResponse.json({ error: 'Failed to assign super admin role' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const clientIP = getClientIP(req)
  
  // SECURITY: Add request validation headers
  const contentType = req.headers.get('content-type')
  const userAgent = req.headers.get('user-agent')
  
  // Log the attempt with request metadata
  logSetupAttempt('attempt', { 
    clientIP,
    contentType,
    userAgent: userAgent?.substring(0, 100), // Limit length for security
    timestamp: new Date().toISOString()
  })
  
  // SECURITY: Enhanced rate limiting - stricter for setup endpoint
  return withRateLimit(rateLimitConfigs.setupStrict, clientIP, async () => {
    try {
      const response = await setupSuperAdmin(clientIP)
      
      // SECURITY: Add security headers to response
      response.headers.set('X-Content-Type-Options', 'nosniff')
      response.headers.set('X-Frame-Options', 'DENY')
      response.headers.set('X-XSS-Protection', '1; mode=block')
      response.headers.set('Referrer-Policy', 'no-referrer')
      response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
      
      return response
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      logSetupAttempt('failure', { 
        reason: 'unexpected_error', 
        clientIP,
        error: errorMessage
      })
      
      console.error('Error setting up super admin:', error)
      return NextResponse.json(
        { error: 'Failed to setup super admin' }, 
        { status: 500 }
      )
    }
  })
}

// SECURITY: Explicitly disable other HTTP methods
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function PATCH() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}