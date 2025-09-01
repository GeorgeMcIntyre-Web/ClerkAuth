import { pgTable, text, timestamp, uuid, boolean } from 'drizzle-orm/pg-core'
import { createInsertSchema, createSelectSchema } from 'drizzle-zod'
import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').unique().notNull(),
  email: text('email').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  imageUrl: text('image_url'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  content: text('content'),
  authorId: uuid('author_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)
export const insertPostSchema = createInsertSchema(posts)
export const selectPostSchema = createSelectSchema(posts)

// Types
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Post = InferSelectModel<typeof posts>
export type NewPost = InferInsertModel<typeof posts>