/**
 * Auto-generated types from Drizzle schema.
 * These replace manually maintained type definitions.
 * Usage: import { Contact, NewContact } from '@0ne/db/types'
 */
import * as schema from '../schema'

// KPI Domain
export type Contact = typeof schema.contacts.$inferSelect
export type NewContact = typeof schema.contacts.$inferInsert
export type Event = typeof schema.events.$inferSelect
export type NewEvent = typeof schema.events.$inferInsert
export type CohortSnapshot = typeof schema.cohortSnapshots.$inferSelect
export type NewCohortSnapshot = typeof schema.cohortSnapshots.$inferInsert
export type Campaign = typeof schema.campaigns.$inferSelect
export type NewCampaign = typeof schema.campaigns.$inferInsert
export type AdMetric = typeof schema.adMetrics.$inferSelect
export type NewAdMetric = typeof schema.adMetrics.$inferInsert
export type MetaAccountDaily = typeof schema.metaAccountDaily.$inferSelect
export type NewMetaAccountDaily = typeof schema.metaAccountDaily.$inferInsert
export type Expense = typeof schema.expenses.$inferSelect
export type NewExpense = typeof schema.expenses.$inferInsert
export type Revenue = typeof schema.revenue.$inferSelect
export type NewRevenue = typeof schema.revenue.$inferInsert
export type DailyAggregate = typeof schema.dailyAggregates.$inferSelect
export type NewDailyAggregate = typeof schema.dailyAggregates.$inferInsert
export type DimensionSource = typeof schema.dimensionSources.$inferSelect
export type DimensionCampaign = typeof schema.dimensionCampaigns.$inferSelect
export type DimensionStage = typeof schema.dimensionStages.$inferSelect
export type DimensionExpenseCategory = typeof schema.dimensionExpenseCategories.$inferSelect
export type DailyExpenseByCategory = typeof schema.dailyExpensesByCategory.$inferSelect
export type WeeklyTrend = typeof schema.weeklyTrends.$inferSelect

// Skool Domain
export type SkoolMember = typeof schema.skoolMembers.$inferSelect
export type NewSkoolMember = typeof schema.skoolMembers.$inferInsert
export type SkoolConversation = typeof schema.skoolConversations.$inferSelect
export type SkoolMessage = typeof schema.skoolMessages.$inferSelect
export type SkoolHandRaiserCampaign = typeof schema.skoolHandRaiserCampaigns.$inferSelect
export type SkoolHandRaiserSent = typeof schema.skoolHandRaiserSent.$inferSelect
export type SkoolMetric = typeof schema.skoolMetrics.$inferSelect
export type SkoolKpi = typeof schema.skoolKpis.$inferSelect
export type SkoolAnalytic = typeof schema.skoolAnalytics.$inferSelect
export type SkoolCategory = typeof schema.skoolCategories.$inferSelect
export type SkoolAboutPageDaily = typeof schema.skoolAboutPageDaily.$inferSelect
export type SkoolCommunityActivityDaily = typeof schema.skoolCommunityActivityDaily.$inferSelect
export type SkoolMembersDaily = typeof schema.skoolMembersDaily.$inferSelect
export type SkoolMembersMonthly = typeof schema.skoolMembersMonthly.$inferSelect
export type SkoolRevenueDaily = typeof schema.skoolRevenueDaily.$inferSelect
export type SkoolRevenueMonthly = typeof schema.skoolRevenueMonthly.$inferSelect
export type SkoolSubscriptionEvent = typeof schema.skoolSubscriptionEvents.$inferSelect

// Scheduler Domain
export type SkoolVariationGroup = typeof schema.skoolVariationGroups.$inferSelect
export type NewSkoolVariationGroup = typeof schema.skoolVariationGroups.$inferInsert
export type SkoolScheduledPost = typeof schema.skoolScheduledPosts.$inferSelect
export type NewSkoolScheduledPost = typeof schema.skoolScheduledPosts.$inferInsert
export type SkoolPostLibraryItem = typeof schema.skoolPostLibrary.$inferSelect
export type NewSkoolPostLibraryItem = typeof schema.skoolPostLibrary.$inferInsert
export type SkoolPostExecutionLog = typeof schema.skoolPostExecutionLog.$inferSelect
export type SkoolCampaignRecord = typeof schema.skoolCampaigns.$inferSelect
export type NewSkoolCampaignRecord = typeof schema.skoolCampaigns.$inferInsert
export type SkoolOneoffPost = typeof schema.skoolOneoffPosts.$inferSelect
export type NewSkoolOneoffPost = typeof schema.skoolOneoffPosts.$inferInsert
export type SkoolGroupSettings = typeof schema.skoolGroupSettings.$inferSelect

// DM Sync Domain
export type DmSyncConfig = typeof schema.dmSyncConfig.$inferSelect
export type DmContactMapping = typeof schema.dmContactMappings.$inferSelect
export type NewDmContactMapping = typeof schema.dmContactMappings.$inferInsert
export type DmMessage = typeof schema.dmMessages.$inferSelect
export type NewDmMessage = typeof schema.dmMessages.$inferInsert
export type DmHandRaiserCampaign = typeof schema.dmHandRaiserCampaigns.$inferSelect
export type DmHandRaiserSent = typeof schema.dmHandRaiserSent.$inferSelect
export type StaffUser = typeof schema.staffUsers.$inferSelect
export type NewStaffUser = typeof schema.staffUsers.$inferInsert
export type ContactChannel = typeof schema.contactChannels.$inferSelect
export type ConversationSyncStatus = typeof schema.conversationSyncStatus.$inferSelect
export type ExtensionCookie = typeof schema.extensionCookies.$inferSelect

// Personal Domain
export type PersonalExpense = typeof schema.personalExpenses.$inferSelect
export type NewPersonalExpense = typeof schema.personalExpenses.$inferInsert
export type PersonalExpenseCategory = typeof schema.personalExpenseCategories.$inferSelect
export type ExpenseCategoryRecord = typeof schema.expenseCategories.$inferSelect
export type PlaidItem = typeof schema.plaidItems.$inferSelect
export type PlaidAccount = typeof schema.plaidAccounts.$inferSelect
export type PlaidTransaction = typeof schema.plaidTransactions.$inferSelect
export type PlaidCategoryMapping = typeof schema.plaidCategoryMappings.$inferSelect

// Notifications
export type NotificationPreference = typeof schema.notificationPreferences.$inferSelect

// GHL
export type GhlTransaction = typeof schema.ghlTransactions.$inferSelect
export type NewGhlTransaction = typeof schema.ghlTransactions.$inferInsert
export type GhlSyncLogEntry = typeof schema.ghlSyncLog.$inferSelect

// Telemetry
export type TelemetryEvent = typeof schema.telemetryEvents.$inferSelect
export type NewTelemetryEvent = typeof schema.telemetryEvents.$inferInsert
export type TelemetryStatusHistory = typeof schema.telemetryStatusHistory.$inferSelect
export type TelemetryFailurePattern = typeof schema.telemetryFailurePatterns.$inferSelect

// System
export type SyncActivityLogEntry = typeof schema.syncActivityLog.$inferSelect
export type NewSyncActivityLogEntry = typeof schema.syncActivityLog.$inferInsert
export type Invite = typeof schema.invites.$inferSelect
export type NewInvite = typeof schema.invites.$inferInsert
export type UserInstall = typeof schema.userInstalls.$inferSelect
export type NewUserInstall = typeof schema.userInstalls.$inferInsert
