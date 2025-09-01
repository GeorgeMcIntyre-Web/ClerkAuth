import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

// Cache database instance in development, create new in production for each request
const globalForDb = globalThis as unknown as {
  db: ReturnType<typeof drizzle> | undefined
}

export const getDb = () => {
  // Skip database initialization during build time
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return null as any
  }
  
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    // Return mock during build time or throw error in runtime
    if (typeof window === 'undefined' && !process.env.DATABASE_URL) {
      console.warn('DATABASE_URL not set, using mock database for build')
      return null as any
    }
    throw new Error('DATABASE_URL is not defined')
  }

  // In production (Vercel), always create new instance
  // In development, reuse instance to prevent connection exhaustion
  if (process.env.NODE_ENV === 'production') {
    const sql = neon(databaseUrl)
    return drizzle(sql, { schema })
  }
  
  // Development: use cached instance
  if (!globalForDb.db) {
    const sql = neon(databaseUrl)
    globalForDb.db = drizzle(sql, { schema })
  }
  
  return globalForDb.db
}

// Export a function that returns the db instance
export const db = getDb
export type Database = ReturnType<typeof getDb>