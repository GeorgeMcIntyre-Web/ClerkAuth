import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
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

export const sites = pgTable('sites', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  url: text('url').unique().notNull(),
  description: text('description'),
  category: text('category').notNull().$type<'premium' | 'standard' | 'admin'>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const systemConfig = pgTable('system_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  key: text('key').unique().notNull(),
  value: text('value').notNull(),
  description: text('description'),
  category: text('category').notNull().$type<'rate_limiting' | 'security' | 'general'>(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Advanced RBAC Schema
export const roles = pgTable('roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(),
  description: text('description'),
  level: integer('level').notNull(), // Hierarchy level (0 = highest)
  isSystem: boolean('is_system').default(false), // System-defined roles
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const permissions = pgTable('permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').unique().notNull(), // e.g., 'users:read', 'admin:write'
  resource: text('resource').notNull(), // e.g., 'users', 'sites', 'admin'
  action: text('action').notNull(), // e.g., 'read', 'write', 'delete', 'admin'
  description: text('description'),
  category: text('category').notNull(), // e.g., 'user_management', 'site_management'
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const rolePermissions = pgTable('role_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
  granted: boolean('granted').default(true), // Allow for explicit denials
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const userRoles = pgTable('user_roles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }), // Optional site-specific role
  granted: boolean('granted').default(true),
  expiresAt: timestamp('expires_at'), // Optional role expiration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const userPermissions = pgTable('user_permissions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  permissionId: uuid('permission_id').references(() => permissions.id, { onDelete: 'cascade' }).notNull(),
  siteId: uuid('site_id').references(() => sites.id, { onDelete: 'cascade' }), // Optional site-specific permission
  granted: boolean('granted').default(true),
  expiresAt: timestamp('expires_at'), // Optional permission expiration
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const teams = pgTable('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  description: text('description'),
  slug: text('slug').unique().notNull(),
  settings: jsonb('settings').$type<Record<string, any>>().default({}),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const teamMembers = pgTable('team_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }).notNull(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }).notNull(),
  isOwner: boolean('is_owner').default(false),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  resource: text('resource').notNull(), // What was affected
  resourceId: text('resource_id'), // ID of affected resource
  userId: uuid('user_id').references(() => users.id),
  userEmail: text('user_email'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  metadata: jsonb('metadata').$type<Record<string, any>>(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
})

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users)
export const selectUserSchema = createSelectSchema(users)
export const insertPostSchema = createInsertSchema(posts)
export const selectPostSchema = createSelectSchema(posts)
export const insertSiteSchema = createInsertSchema(sites)
export const selectSiteSchema = createSelectSchema(sites)
export const insertSystemConfigSchema = createInsertSchema(systemConfig)
export const selectSystemConfigSchema = createSelectSchema(systemConfig)

// Advanced RBAC schemas
export const insertRoleSchema = createInsertSchema(roles)
export const selectRoleSchema = createSelectSchema(roles)
export const insertPermissionSchema = createInsertSchema(permissions)
export const selectPermissionSchema = createSelectSchema(permissions)
export const insertUserRoleSchema = createInsertSchema(userRoles)
export const selectUserRoleSchema = createSelectSchema(userRoles)
export const insertUserPermissionSchema = createInsertSchema(userPermissions)
export const selectUserPermissionSchema = createSelectSchema(userPermissions)
export const insertTeamSchema = createInsertSchema(teams)
export const selectTeamSchema = createSelectSchema(teams)
export const insertAuditLogSchema = createInsertSchema(auditLogs)
export const selectAuditLogSchema = createSelectSchema(auditLogs)

// Database relations
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
  teamMemberships: many(teamMembers),
  auditLogs: many(auditLogs),
}))

export const rolesRelations = relations(roles, ({ many }) => ({
  permissions: many(rolePermissions),
  userRoles: many(userRoles),
  teamMembers: many(teamMembers),
}))

export const permissionsRelations = relations(permissions, ({ many }) => ({
  roles: many(rolePermissions),
  userPermissions: many(userPermissions),
}))

export const sitesRelations = relations(sites, ({ many }) => ({
  userRoles: many(userRoles),
  userPermissions: many(userPermissions),
}))

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
}))

// Types
export type User = InferSelectModel<typeof users>
export type NewUser = InferInsertModel<typeof users>
export type Post = InferSelectModel<typeof posts>
export type NewPost = InferInsertModel<typeof posts>
export type Site = InferSelectModel<typeof sites>
export type NewSite = InferInsertModel<typeof sites>
export type SystemConfig = InferSelectModel<typeof systemConfig>
export type NewSystemConfig = InferInsertModel<typeof systemConfig>

// Advanced RBAC types
export type Role = InferSelectModel<typeof roles>
export type NewRole = InferInsertModel<typeof roles>
export type Permission = InferSelectModel<typeof permissions>
export type NewPermission = InferInsertModel<typeof permissions>
export type UserRole = InferSelectModel<typeof userRoles>
export type NewUserRole = InferInsertModel<typeof userRoles>
export type UserPermission = InferSelectModel<typeof userPermissions>
export type NewUserPermission = InferInsertModel<typeof userPermissions>
export type Team = InferSelectModel<typeof teams>
export type NewTeam = InferInsertModel<typeof teams>
export type TeamMember = InferSelectModel<typeof teamMembers>
export type NewTeamMember = InferInsertModel<typeof teamMembers>
export type AuditLog = InferSelectModel<typeof auditLogs>
export type NewAuditLog = InferInsertModel<typeof auditLogs>