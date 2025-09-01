import { auth, clerkClient } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { USER_ROLES } from '@/lib/auth-config'
import { db } from '@/lib/db'
import { sites, insertSiteSchema } from '@/lib/schema'
import { eq } from 'drizzle-orm'

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

    const allSites = await db().select().from(sites).where(eq(sites.isActive, true))
    return NextResponse.json(allSites)
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
    
    // Validate input using Zod schema
    const validationResult = insertSiteSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validationResult.error.errors }, { status: 400 })
    }

    const { name, url, description, category } = validationResult.data

    // Validate URL format
    try {
      new URL(url)
    } catch {
      return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
    }

    // Check if URL already exists
    const existingSite = await db().select().from(sites).where(eq(sites.url, url)).limit(1)
    if (existingSite.length > 0) {
      return NextResponse.json({ error: 'Site URL already exists' }, { status: 400 })
    }

    // Insert new site into database
    const [newSite] = await db().insert(sites).values({
      name,
      url,
      description,
      category: category as 'premium' | 'standard' | 'admin',
      isActive: true
    }).returning()

    // Log the addition
    console.log(`ADMIN ACTION: Site "${name}" (${url}) added by ${currentUser.emailAddresses[0]?.emailAddress}`)

    return NextResponse.json({ success: true, site: newSite })
  } catch (error) {
    console.error('Error adding site:', error)
    return NextResponse.json({ error: 'Failed to add site' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const siteId = searchParams.get('id')

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID required' }, { status: 400 })
    }

    const body = await request.json()
    
    // Validate input using Zod schema (excluding id field for updates)
    const updateSchema = insertSiteSchema.partial().omit({ id: true, createdAt: true })
    const validationResult = updateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json({ error: 'Invalid input data', details: validationResult.error.errors }, { status: 400 })
    }

    const updateData = validationResult.data

    // Validate URL format if provided
    if (updateData.url) {
      try {
        new URL(updateData.url)
      } catch {
        return NextResponse.json({ error: 'Invalid URL format' }, { status: 400 })
      }

      // Check if URL already exists (excluding current site)
      const existingSite = await db().select().from(sites).where(eq(sites.url, updateData.url)).limit(1)
      if (existingSite.length > 0 && existingSite[0].id !== siteId) {
        return NextResponse.json({ error: 'Site URL already exists' }, { status: 400 })
      }
    }

    // Check if site exists
    const [currentSite] = await db().select().from(sites).where(eq(sites.id, siteId)).limit(1)
    if (!currentSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Update site in database
    const [updatedSite] = await db().update(sites).set({
      ...updateData,
      updatedAt: new Date()
    }).where(eq(sites.id, siteId)).returning()

    // Log the update
    console.log(`ADMIN ACTION: Site "${updatedSite.name}" (${updatedSite.url}) updated by ${currentUser.emailAddresses[0]?.emailAddress}`)

    return NextResponse.json({ success: true, site: updatedSite })
  } catch (error) {
    console.error('Error updating site:', error)
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 })
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

    // Find the site to get details for logging
    const [existingSite] = await db().select().from(sites).where(eq(sites.id, siteId)).limit(1)
    if (!existingSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // Soft delete by setting isActive to false
    await db().update(sites).set({ isActive: false, updatedAt: new Date() }).where(eq(sites.id, siteId))

    // Log the deletion
    console.log(`ADMIN ACTION: Site "${existingSite.name}" (${existingSite.url}) deleted by ${currentUser.emailAddresses[0]?.emailAddress}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting site:', error)
    return NextResponse.json({ error: 'Failed to delete site' }, { status: 500 })
  }
}