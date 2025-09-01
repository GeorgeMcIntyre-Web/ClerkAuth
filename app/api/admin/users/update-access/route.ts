import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { USER_ROLES, SITE_PERMISSIONS } from '@/lib/auth-config'

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
    const { userId: targetUserId, siteAccess } = body

    // Validate site permissions
    const validPermissions = siteAccess.every((permission: string) => 
      Object.values(SITE_PERMISSIONS).includes(permission as any)
    )
    
    if (!validPermissions) {
      return NextResponse.json({ error: 'Invalid site permissions' }, { status: 400 })
    }

    // Get target user's current metadata
    const targetUser = await clerkClient.users.getUser(targetUserId)
    const currentRole = targetUser.publicMetadata?.role as string || USER_ROLES.GUEST

    // Update user's site access in Clerk metadata
    await clerkClient.users.updateUserMetadata(targetUserId, {
      publicMetadata: {
        ...targetUser.publicMetadata,
        role: currentRole,
        siteAccess: siteAccess
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Site access updated successfully',
      siteAccess
    })

  } catch (error) {
    console.error('Error updating site access:', error)
    return NextResponse.json(
      { error: 'Failed to update site access' }, 
      { status: 500 }
    )
  }
}