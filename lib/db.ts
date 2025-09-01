import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

let dbInstance: ReturnType<typeof drizzle> | null = null

export const getDb = () => {
  if (!dbInstance) {
    const databaseUrl = process.env.DATABASE_URL
    
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined')
    }

    const sql = neon(databaseUrl)
    dbInstance = drizzle(sql, { schema })
  }
  
  return dbInstance
}

// For build compatibility - don't initialize during build
export const db = getDb
export type Database = ReturnType<typeof getDb>