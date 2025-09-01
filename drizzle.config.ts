import type { Config } from 'drizzle-kit'
import * as dotenv from 'dotenv'

dotenv.config({ path: ['.env.local', '.env'] })

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined')
}

export default {
  schema: './lib/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
} satisfies Config