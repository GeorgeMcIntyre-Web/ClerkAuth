import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { USER_ROLES, ROLE_PERMISSIONS } from '@/lib/auth-config'

async function setupSuperAdmin() {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // This is a one-time setup to make the first user a super admin
  // In production, you'd want to secure this endpoint or run it manually
  
  const user = await clerkClient.users.getUser(userId)
  
  // Set the current user as super admin
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: USER_ROLES.SUPER_ADMIN,
      siteAccess: ROLE_PERMISSIONS[USER_ROLES.SUPER_ADMIN]
    }
  })

  return NextResponse.json({ 
    success: true, 
    message: `User ${user.emailAddresses[0]?.emailAddress} is now a Super Admin`,
    role: USER_ROLES.SUPER_ADMIN
  })
}

export async function GET() {
  try {
    return await setupSuperAdmin()
  } catch (error) {
    console.error('Error setting up super admin:', error)
    return NextResponse.json(
      { error: 'Failed to setup super admin' }, 
      { status: 500 }
    )
  }
}

export async function POST() {
  try {
    return await setupSuperAdmin()
  } catch (error) {
    console.error('Error setting up super admin:', error)
    return NextResponse.json(
      { error: 'Failed to setup super admin' }, 
      { status: 500 }
    )
  }
}