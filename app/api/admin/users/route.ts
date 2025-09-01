import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { users } from '@/lib/schema'
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

    // Get all users from Clerk
    const clerkUsers = await clerkClient.users.getUserList({
      limit: 100 // Adjust as needed
    })

    // Get user data from our database
    const db = getDb()
    const dbUsers = await db.select().from(users)

    // Combine Clerk data with our database data
    const combinedUsers = clerkUsers.data.map(clerkUser => {
      const dbUser = dbUsers.find(db => db.clerkId === clerkUser.id)
      
      return {
        id: dbUser?.id || 0,
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        role: clerkUser.publicMetadata?.role as string || USER_ROLES.GUEST,
        createdAt: clerkUser.createdAt,
        lastActive: clerkUser.lastSignInAt || clerkUser.createdAt,
        siteAccess: clerkUser.publicMetadata?.siteAccess as string[] || []
      }
    })

    return NextResponse.json(combinedUsers)

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' }, 
      { status: 500 }
    )
  }
}