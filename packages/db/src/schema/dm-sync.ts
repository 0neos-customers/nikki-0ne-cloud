import { pgTable, uuid, text, integer, boolean, timestamp, date, numeric, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// DM Sync Config
// ---------------------------------------------------------------------------

export const dmSyncConfig = pgTable('dm_sync_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id'),
  skoolCommunitySlug: text('skool_community_slug'),
  skoolCommunityId: text('skool_community_id'),
  ghlLocationId: text('ghl_location_id'),
  ghlAccessToken: text('ghl_access_token'),
  ghlRefreshToken: text('ghl_refresh_token'),
  ghlTokenExpiresAt: timestamp('ghl_token_expires_at', { withTimezone: true }),
  enabled: boolean('enabled').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('dm_sync_config_user_community_idx').on(table.clerkUserId, table.skoolCommunitySlug),
])

// ---------------------------------------------------------------------------
// DM Contact Mappings
// ---------------------------------------------------------------------------

export const dmContactMappings = pgTable('dm_contact_mappings', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id'),
  skoolUserId: text('skool_user_id'),
  skoolUsername: text('skool_username'),
  skoolDisplayName: text('skool_display_name'),
  ghlContactId: text('ghl_contact_id'),
  contactType: text('contact_type').default('unknown'),
  email: text('email'),
  phone: text('phone'),
  matchMethod: text('match_method'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('dm_contact_mappings_user_skool_idx').on(table.clerkUserId, table.skoolUserId),
  index('dm_contact_mappings_ghl_contact_idx').on(table.ghlContactId),
  index('dm_contact_mappings_unmatched_idx')
    .on(table.clerkUserId)
    .where(sql`ghl_contact_id IS NULL`),
  index('dm_contact_mappings_contact_type_idx').on(table.contactType),
])

// ---------------------------------------------------------------------------
// DM Messages
// ---------------------------------------------------------------------------

export const dmMessages = pgTable('dm_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id'),
  skoolConversationId: text('skool_conversation_id'),
  skoolMessageId: text('skool_message_id'),
  ghlMessageId: text('ghl_message_id'),
  skoolUserId: text('skool_user_id'),
  staffSkoolId: text('staff_skool_id'),
  staffDisplayName: text('staff_display_name'),
  ghlUserId: text('ghl_user_id'),
  senderName: text('sender_name'),
  direction: text('direction'),
  messageText: text('message_text'),
  status: text('status').default('pending'),
  source: text('source').default('ghl'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  syncedAt: timestamp('synced_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('dm_messages_user_skool_msg_idx').on(table.clerkUserId, table.skoolMessageId),
  index('dm_messages_user_idx').on(table.clerkUserId),
  index('dm_messages_conversation_idx').on(table.skoolConversationId),
  index('dm_messages_pending_ghl_sync_idx')
    .on(table.clerkUserId, table.status)
    .where(sql`status = 'pending'`),
  index('dm_messages_extension_outbound_idx')
    .on(table.clerkUserId, table.source, table.status)
    .where(sql`source = 'ghl'`),
  index('dm_messages_staff_idx').on(table.staffSkoolId),
])

// ---------------------------------------------------------------------------
// DM Hand Raiser Campaigns
// ---------------------------------------------------------------------------

export const dmHandRaiserCampaigns = pgTable('dm_hand_raiser_campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id'),
  postUrl: text('post_url').notNull(),
  skoolPostId: text('skool_post_id'),
  keywordFilter: text('keyword_filter'),
  dmTemplate: text('dm_template'),
  ghlTag: text('ghl_tag'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
})

// ---------------------------------------------------------------------------
// DM Hand Raiser Sent
// ---------------------------------------------------------------------------

export const dmHandRaiserSent = pgTable('dm_hand_raiser_sent', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaignId: uuid('campaign_id').references(() => dmHandRaiserCampaigns.id),
  skoolUserId: text('skool_user_id').notNull(),
  sentAt: timestamp('sent_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('dm_hand_raiser_sent_campaign_user_idx').on(table.campaignId, table.skoolUserId),
])

// ---------------------------------------------------------------------------
// Staff Users
// ---------------------------------------------------------------------------

export const staffUsers = pgTable('staff_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id'),
  skoolUserId: text('skool_user_id').unique().notNull(),
  skoolUsername: text('skool_username'),
  displayName: text('display_name').notNull(),
  ghlUserId: text('ghl_user_id'),
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('staff_users_clerk_user_idx').on(table.clerkUserId),
  index('staff_users_ghl_user_idx').on(table.ghlUserId),
])

// ---------------------------------------------------------------------------
// Contact Channels
// ---------------------------------------------------------------------------

export const contactChannels = pgTable('contact_channels', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: text('clerk_user_id'),
  skoolUserId: text('skool_user_id'),
  staffSkoolId: text('staff_skool_id'),
  skoolChannelId: text('skool_channel_id'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('contact_channels_user_staff_idx').on(table.clerkUserId, table.skoolUserId, table.staffSkoolId),
  index('contact_channels_staff_user_idx').on(table.staffSkoolId, table.skoolUserId),
  index('contact_channels_skool_user_idx').on(table.skoolUserId),
  index('contact_channels_channel_idx').on(table.skoolChannelId),
])

// ---------------------------------------------------------------------------
// Conversation Sync Status
// ---------------------------------------------------------------------------

export const conversationSyncStatus = pgTable('conversation_sync_status', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffSkoolId: text('staff_skool_id'),
  conversationId: text('conversation_id'),
  participantName: text('participant_name'),
  lastSyncedMessageId: text('last_synced_message_id'),
  lastSyncedMessageTime: timestamp('last_synced_message_time', { withTimezone: true }),
  backfillComplete: boolean('backfill_complete').default(false),
  lastSyncTime: timestamp('last_sync_time', { withTimezone: true }),
  totalMessagesSynced: integer('total_messages_synced').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('conversation_sync_status_staff_conv_idx').on(table.staffSkoolId, table.conversationId),
  index('conversation_sync_status_staff_idx').on(table.staffSkoolId),
  index('conversation_sync_status_incomplete_idx')
    .on(table.staffSkoolId)
    .where(sql`backfill_complete = false`),
])

// ---------------------------------------------------------------------------
// Extension Cookies
// ---------------------------------------------------------------------------

export const extensionCookies = pgTable('extension_cookies', {
  id: uuid('id').primaryKey().defaultRandom(),
  staffSkoolId: text('staff_skool_id').unique(),
  cookiesEncrypted: text('cookies_encrypted'),
  authTokenExpiresAt: timestamp('auth_token_expires_at', { withTimezone: true }),
  sessionCookiePresent: boolean('session_cookie_present'),
  lastUpdated: timestamp('last_updated', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('extension_cookies_staff_idx').on(table.staffSkoolId),
  index('extension_cookies_expiry_idx').on(table.authTokenExpiresAt),
])
