import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { USER_ROLES } from '@/lib/auth-config'

// Store sites in Clerk's organization metadata for now
// In production, you'd use a database
let sites: Array<{
  id: string
  name: string
  url: string
  description?: string
  category: 'premium' | 'standard' | 'admin'
  createdAt: string
}> = [
  {
    id: '1',
    name: 'House Atreides',
    url: 'https://www.houseatreides.space',
    description: 'Premium Dune-themed content site',
    category: 'premium',
    createdAt: new Date().toISOString()
  }
]

export async function GET() {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await clerkClient.users.getUser(userId)
    const currentUserRole = currentUser.publicMetadata?.role as string
    
    if (currentUserRole !== USER_ROLES.ADMIN && currentUserRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    return NextResponse.json(sites)
  } catch (error) {
    console.error('Error fetching sites:', error)
    return NextResponse.json({ error: 'Failed to fetch sites' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { name, url, description, category } = body

    if (!name || !url) {
      return NextResponse.json({ error: 'Name and URL are required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Check if URL already exists
    if (sites.some(site => site.url === url)) {
      return NextResponse.json({ error: 'Site URL already exists' }, { status: 400 })
    }

    const newSite = {
      id: Date.now().toString(),
      name,
      url,
      description,
      category,
      createdAt: new Date().toISOString()
    }

    sites.push(newSite)

    // Log the addition
    console.log(`ADMIN ACTION: Site "${name}" (${url}) added by ${currentUser.emailAddresses[0]?.emailAddress}`)

    return NextResponse.json({ success: true, site: newSite })
  } catch (error) {
    console.error('Error adding site:', error)
    return NextResponse.json({ error: 'Failed to add site' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await clerkClient.users.getUser(userId)
    const currentUserRole = currentUser.publicMetadata?.role as string
    
    if (currentUserRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('id')

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 })
    }

    const siteIndex = sites.findIndex(site => site.id === siteId)
    if (siteIndex === -1) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    const deletedSite = sites.splice(siteIndex, 1)[0]

    // Log the deletion
    console.log(`ADMIN ACTION: Site "${deletedSite.name}" (${deletedSite.url}) deleted by ${currentUser.emailAddresses[0]?.emailAddress}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting site:', error)
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
}