import { pgTable, uuid, text, integer, boolean, timestamp, date, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// Telemetry Events
// ---------------------------------------------------------------------------

export const telemetryEvents = pgTable('telemetry_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventType: text('event_type').notNull(),
  platform: text('platform'),
  arch: text('arch'),
  osVersion: text('os_version'),
  bunVersion: text('bun_version'),
  oneVersion: text('one_version'),
  principalName: text('principal_name'),
  results: jsonb('results'),
  summary: jsonb('summary'),
  systemInfo: jsonb('system_info'),
  status: text('status').default('new'),
  fixNotes: text('fix_notes'),
  fixCommit: text('fix_commit'),
  fixActions: jsonb('fix_actions'),
  fixSummary: jsonb('fix_summary'),
  cloudUserId: text('cloud_user_id'),
  installToken: uuid('install_token'),
  triagedAt: timestamp('triaged_at', { withTimezone: true }),
  fixedAt: timestamp('fixed_at', { withTimezone: true }),
  deployedAt: timestamp('deployed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('telemetry_events_type_created_idx').on(table.eventType, table.createdAt),
  index('telemetry_events_principal_idx').on(table.principalName),
  index('telemetry_events_has_fixes_idx')
    .on(table.status)
    .where(sql`fix_notes IS NOT NULL`),
  index('telemetry_events_cloud_user_idx').on(table.cloudUserId),
])

// ---------------------------------------------------------------------------
// Telemetry Status History
// ---------------------------------------------------------------------------

export const telemetryStatusHistory = pgTable('telemetry_status_history', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id').notNull().references(() => telemetryEvents.id, { onDelete: 'cascade' }),
  oldStatus: text('old_status'),
  newStatus: text('new_status'),
  note: text('note'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('telemetry_status_history_event_idx').on(table.eventId),
])

// ---------------------------------------------------------------------------
// Telemetry Failure Patterns
// ---------------------------------------------------------------------------

export const telemetryFailurePatterns = pgTable('telemetry_failure_patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  patternKey: text('pattern_key').unique().notNull(),
  failureName: text('failure_name'),
  category: text('category'),
  occurrenceCount: integer('occurrence_count').default(0),
  firstSeen: timestamp('first_seen', { withTimezone: true }),
  lastSeen: timestamp('last_seen', { withTimezone: true }),
  knownFix: text('known_fix'),
  autoFixable: boolean('auto_fixable').default(false),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('telemetry_failure_patterns_count_idx').on(table.occurrenceCount),
])
