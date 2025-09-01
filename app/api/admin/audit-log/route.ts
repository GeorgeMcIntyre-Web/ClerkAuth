import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { USER_ROLES } from '@/lib/auth-config'
import { clerkClient } from '@clerk/nextjs/server'

// Audit log schema
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  details: text('details').notNull(),
  adminId: text('admin_id').notNull(),
  adminEmail: text('admin_email').notNull(),
  targetUserId: text('target_user_id'),
  targetUserEmail: text('target_user_email'),
  siteId: text('site_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})

export async function POST(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin permissions
    const user = await clerkClient.users.getUser(userId)
    const userRole = user.publicMetadata?.role as string
    
    if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await req.json()
    const { action, details, targetUserId, targetUserEmail, siteId } = body

    // Get user agent and IP from headers
    const userAgent = req.headers.get('user-agent') || 'Unknown'
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'Unknown'

    const db = getDb()
    
    const auditEntry = await db.insert(auditLogs).values({
      action,
      details,
      adminId: userId,
      adminEmail: user.emailAddresses[0]?.emailAddress || 'Unknown',
      targetUserId,
      targetUserEmail,
      siteId,
      ipAddress: ipAddress.split(',')[0], // Handle multiple IPs
      userAgent,
    }).returning()

    return NextResponse.json({ success: true, auditId: auditEntry[0].id })

  } catch (error) {
    console.error('Audit log error:', error)
    return NextResponse.json(
      { error: 'Failed to create audit log entry' },
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify admin permissions
    const user = await clerkClient.users.getUser(userId)
    const userRole = user.publicMetadata?.role as string
    
    if (userRole !== USER_ROLES.ADMIN && userRole !== USER_ROLES.SUPER_ADMIN) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const db = getDb()
    const url = new URL(req.url)
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const action = url.searchParams.get('action')
    const adminId = url.searchParams.get('adminId')

    // Build query with filters
    let query = db.select().from(auditLogs)

    // Apply filters
    // Note: In a real implementation, you'd use proper query builders
    // This is simplified for demonstration

    const logs = await query
      .limit(limit)
      .offset(offset)
      .orderBy(auditLogs.timestamp)

    return NextResponse.json(logs)

  } catch (error) {
    console.error('Get audit logs error:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve audit logs' },
      { status: 500 }
    )
  }
}