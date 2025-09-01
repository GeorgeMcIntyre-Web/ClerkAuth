import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse, NextRequest } from 'next/server'
import { USER_ROLES } from '@/lib/auth-config'

export async function GET(request: NextRequest) {
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

    // Parse pagination parameters from query
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20', 10))) // Max 100, default 20
    const offset = (page - 1) * limit

    // Get users from Clerk with pagination
    const clerkUsers = await clerkClient.users.getUserList({
      limit: limit,
      offset: offset
    })

    // Get total count for pagination metadata
    const totalUsers = clerkUsers.totalCount || 0
    const totalPages = Math.ceil(totalUsers / limit)

    // Map Clerk users to our format
    const users = clerkUsers.data.map((clerkUser, index) => ({
      id: offset + index + 1, // Sequential ID accounting for pagination
      clerkId: clerkUser.id,
      email: clerkUser.emailAddresses[0]?.emailAddress || '',
      firstName: clerkUser.firstName,
      lastName: clerkUser.lastName,
      role: clerkUser.publicMetadata?.role as string || USER_ROLES.GUEST,
      createdAt: new Date(clerkUser.createdAt).toISOString(),
      lastActive: clerkUser.lastSignInAt ? new Date(clerkUser.lastSignInAt).toISOString() : new Date(clerkUser.createdAt).toISOString(),
      siteAccess: clerkUser.publicMetadata?.siteAccess as string[] || []
    }))

    // Return paginated response
    return NextResponse.json({
      users,
      pagination: {
        currentPage: page,
        totalPages,
        totalUsers,
        limit,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' }, 
      { status: 500 }
    )
  }
}