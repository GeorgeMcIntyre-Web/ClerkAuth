import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { USER_ROLES, ROLE_PERMISSIONS } from '@/lib/auth-config'

async function setupSuperAdmin() {
  const { userId } = auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // SECURITY: Check if super admin already exists (one-time setup only)
  try {
    const existingUsers = await clerkClient.users.getUserList({ limit: 100 })
    const hasExistingSuperAdmin = existingUsers.data.some(user => 
      user.publicMetadata?.role === USER_ROLES.SUPER_ADMIN
    )
    
    // Allow setup if no super admin exists, or if explicitly enabled
    if (process.env.NODE_ENV === 'production' && hasExistingSuperAdmin && process.env.ADMIN_SETUP_ENABLED !== 'true') {
      return NextResponse.json({ error: 'Setup endpoint disabled - Super admin already exists' }, { status: 403 })
    }
  } catch (error) {
    console.error('Error checking existing super admins:', error)
    return NextResponse.json({ error: 'Setup failed' }, { status: 500 })
  }

  const user = await clerkClient.users.getUser(userId)
  
  // Set the current user as super admin
  await clerkClient.users.updateUserMetadata(userId, {
    publicMetadata: {
      role: USER_ROLES.SUPER_ADMIN,
      siteAccess: ROLE_PERMISSIONS[USER_ROLES.SUPER_ADMIN]
    }
  })

  // Log security event
  console.log(`SECURITY EVENT: Super Admin created for user ${user.emailAddresses[0]?.emailAddress} (${userId}) at ${new Date().toISOString()}`)

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