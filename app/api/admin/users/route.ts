import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { USER_ROLES } from '@/lib/auth-config'

export async function GET() {
  try {
    // Check if user is admin
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await clerkClient.users.getUser(userId)
    const userRole = currentUser.publicMetadata?.role as string
    
    if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    // Get all users from Clerk (no database dependency)
    const clerkUsers = await clerkClient.users.getUserList({
      limit: 100 // Adjust as needed
    })

    // Map Clerk users to our format
    const users = clerkUsers.data.map((clerkUser, index) => ({
      id: index + 1, // Simple incremental ID for display
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role: clerkUser.publicMetadata?.role as string || USER_ROLES.GUEST,
      createdAt: new Date(clerkUser.createdAt).toISOString(),
      lastActive: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt).toISOString() : new Date(clerkUser.createdAt).toISOString(),
      siteAccess: clerkUser.publicMetadata?.siteAccess as string[] || []
    }))

    return NextResponse.json(users)

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' }, 
      { status: 500 }
    )
  }
}