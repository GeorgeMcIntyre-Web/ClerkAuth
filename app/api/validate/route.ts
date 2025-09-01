import { NextResponse } from 'next/server'
import { verifyAuthToken, isTokenExpired } from '@/lib/jwt'
import { clerkClient } from '@clerk/nextjs/server'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { auth_token, user_id } = body

    if (!auth_token || !user_id) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Missing required parameters' 
      }, { status: 400 })
    }

    // Check if token is expired
    if (isTokenExpired(auth_token)) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token expired' 
      }, { status: 401 })
    }

    // Verify JWT token
    const tokenData = verifyAuthToken(auth_token)
    if (!tokenData) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid token' 
      }, { status: 401 })
    }

    // Verify user ID matches token
    if (tokenData.userId !== user_id) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Token user mismatch' 
      }, { status: 401 })
    }

    // Get fresh user data from Clerk to ensure current permissions
    try {
      const user = await clerkClient.users.getUser(user_id)
      const currentRole = (user.publicMetadata?.role as string) || 'GUEST'
      const currentSiteAccess = (user.publicMetadata?.siteAccess as string[]) || []

      return NextResponse.json({
        valid: true,
        user: {
          id: user.id,
          email: user.emailAddresses[0]?.emailAddress,
          role: currentRole,
          siteAccess: currentSiteAccess,
          firstName: user.firstName,
          lastName: user.lastName
        },
        tokenData: {
          timestamp: tokenData.timestamp,
          role: tokenData.role
        }
      })

    } catch (userError) {
      console.error('User validation error:', userError)
      return NextResponse.json({ 
        valid: false, 
        error: 'User validation failed' 
      }, { status: 401 })
    }

  } catch (error) {
    console.error('Token validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Validation failed' }, 
      { status: 500 }
    )
  }
}

// GET endpoint for external sites to check token validity quickly
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const auth_token = searchParams.get('auth_token')
  const user_id = searchParams.get('user_id')

  if (!auth_token || !user_id) {
    return NextResponse.json({ 
      valid: false, 
      error: 'Missing parameters' 
    }, { status: 400 })
  }

  // Quick token validation without full user data
  if (isTokenExpired(auth_token)) {
    return NextResponse.json({ valid: false, error: 'Token expired' })
  }

  const tokenData = verifyAuthToken(auth_token)
  if (!tokenData || tokenData.userId !== user_id) {
    return NextResponse.json({ valid: false, error: 'Invalid token' })
  }

  return NextResponse.json({ 
    valid: true, 
    role: tokenData.role,
    timestamp: tokenData.timestamp 
  })
}