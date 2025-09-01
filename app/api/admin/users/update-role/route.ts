import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { USER_ROLES, ROLE_PERMISSIONS } from '@/lib/auth-config'

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

    const body = await request.json()
    const { userId: targetUserId, role: newRole } = body

    // Validate the new role
    if (!Object.values(USER_ROLES).includes(newRole)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Prevent non-super-admins from creating super admins
    if (newRole === USER_ROLES.SUPER_ADMIN && currentUserRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ 
        error: 'Only super admins can assign super admin role' 
      }, { status: 403 })
    }

    // Update user role in Clerk metadata
    await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        role: newRole,
        // Automatically assign default site access based on role
        siteAccess: ROLE_PERMISSIONS[newRole as keyof typeof ROLE_PERMISSIONS] || []
      }
    })

    return NextResponse.json({ success: true, message: 'Role updated successfully' })

  } catch (error) {
    console.error('Error updating user role:', error)
    return NextResponse.json(
      { error: 'Failed to update user role' }, 
      { status: 500 }
    )
  }
}