import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { users, posts, insertPostSchema } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    
    // Get user from database
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)

    if (dbUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get user's posts
    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.authorId, dbUser[0].id))
      .orderBy(posts.createdAt)

    return NextResponse.json(userPosts)
  } catch (error) {
    console.error('Error fetching posts:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getDb()
    const body = await request.json()
    
    // Validate input
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json({ error: 'Title is required and must be a non-empty string' }, { status: 400 })
    }

    const validatedData = insertPostSchema.parse({
      title: body.title.trim(),
      content: body.content?.trim() || null,
      published: Boolean(body.published),
    })

    // Get user from database
    const dbUser = await db
      .select()
      .from(users)
      .where(eq(users.clerkId, userId))
      .limit(1)

    if (dbUser.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create post
    const newPost = await db
      .insert(posts)
      .values({
        ...validatedData,
        authorId: dbUser[0].id,
      })
      .returning()

    return NextResponse.json(newPost[0], { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input data', details: error.message }, { status: 400 })
    }
    console.error('Error creating post:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}