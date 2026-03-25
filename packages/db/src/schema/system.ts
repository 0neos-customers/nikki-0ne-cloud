import { pgTable, uuid, text, integer, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'

// ─── Sync Activity Log ───────────────────────────────────────────────────────

export const syncActivityLog = pgTable('sync_activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  syncType: text('sync_type').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  recordsSynced: integer('records_synced'),
  status: text('status'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_sync_activity_log_sync_type').on(table.syncType),
  index('idx_sync_activity_log_started_at').on(table.startedAt),
  index('idx_sync_activity_log_status').on(table.status),
])

// ─── Invites ─────────────────────────────────────────────────────────────────

export const invites = pgTable('invites', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name'),
  source: text('source').notNull().default('manual'),
  skoolMemberId: text('skool_member_id'),
  status: text('status').notNull().default('pending'),
  inviteToken: uuid('invite_token').notNull().defaultRandom(),
  clerkUserId: text('clerk_user_id'),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('uq_invites_invite_token').on(table.inviteToken),
  index('idx_invites_email').on(table.email),
  index('idx_invites_status').on(table.status),
])

// ─── User Installs ───────────────────────────────────────────────────────────

export const userInstalls = pgTable('user_installs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id').unique(),
  installToken: uuid('install_token').unique().defaultRandom(),
  status: text('status').default('pending'),
  platform: text('platform'),
  arch: text('arch'),
  osVersion: text('os_version'),
  bunVersion: text('bun_version'),
  oneVersion: text('one_version'),
  principalName: text('principal_name'),
  downloadedAt: timestamp('downloaded_at', { withTimezone: true }),
  connectedAt: timestamp('connected_at', { withTimezone: true }),
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})
