import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { USER_ROLES, ROLE_PERMISSIONS } from '@/lib/auth-config'
import { updateUserRoleSchema, validateUserId } from '@/lib/validation'
import { ZodError } from 'zod'

export async function POST(request: NextRequest) {
  try {
    // Check if current user is admin
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await clerkClient.users.getUser(userId)
    const currentUserRole = currentUser.publicMetadata?.role as string
    
    if (currentUserRole !== USER_ROLES.ADMIN && currentUserRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = updateUserRoleSchema.parse(body)
    
    // Additional validation and sanitization
    const targetUserId = validateUserId(validatedData.userId)
    const newRole = validatedData.role

    // Prevent non-super-admins from creating super admins
    if (newRole === USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ 
        error: 'Only super admins can assign super admin role' 
      }, { status: 403 })
    }

    // Security: Prevent users from changing their own role
    if (targetUserId === userId) {
      return NextResponse.json({ error: 'Cannot change your own role' }, { status: 403 })
    }

    // Update user role in Clerk metadata
    await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        role: newRole,
        // Automatically assign default site access based on role
        siteAccess: ROLE_PERMISSIONS[newRole as keyof typeof ROLE_PERMISSIONS] || []
      }
    })

    // Audit log
    console.log(`AUDIT: User role updated by ${userId} - Target: ${targetUserId}, New Role: ${newRole}, Timestamp: ${new Date().toISOString()}`)

    return NextResponse.json({ success: true, message: 'Role updated successfully' })

  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: error.errors 
      }, { status: 400 })
    }
    
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    )
  }
}