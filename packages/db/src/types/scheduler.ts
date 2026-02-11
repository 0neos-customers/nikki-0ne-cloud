// Skool Post Scheduler database types

/**
 * Execution status for scheduled posts
 */
export type SchedulerExecutionStatus = 'success' | 'failed' | 'skipped'

/**
 * Status for one-off scheduled posts
 * Workflow: draft → approved → pending (scheduled for auto-posting) → published
 */
export type OneOffPostStatus = 'pending' | 'draft' | 'approved' | 'published' | 'posted_manually' | 'failed' | 'cancelled'

/**
 * Status for post library items (approval workflow)
 */
export type PostLibraryStatus = 'draft' | 'approved' | 'active'

/**
 * Source tracking for post library items
 */
export type PostLibrarySource = 'manual' | 'api' | 'import'

/**
 * Day of week constants (0 = Sunday, 6 = Saturday)
 */
export const DAY_OF_WEEK = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
} as const

export type DayOfWeek = (typeof DAY_OF_WEEK)[keyof typeof DAY_OF_WEEK]

/**
 * Day names array for display (index matches day_of_week value)
 */
export const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const

export type DayName = (typeof DAY_NAMES)[number]

/**
 * Variation group for flexible post matching (database row)
 */
export interface SkoolVariationGroup {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * Schedule slot for auto-posting (database row)
 */
export interface SkoolScheduledPost {
  id: string
  group_slug: string
  category: string
  category_id: string | null
  day_of_week: DayOfWeek
  time: string // "HH:MM" format (24hr)
  variation_group_id: string | null // Reference to variation group for content
  is_active: boolean
  last_run_at: string | null
  note: string | null
  created_at: string
  updated_at: string
  // Joined data (optional)
  variation_group?: SkoolVariationGroup | null
}

/**
 * Content item for rotation in the post library (database row)
 */
export interface SkoolPostLibraryItem {
  id: string
  category: string
  day_of_week: DayOfWeek | null // Now nullable (legacy, not used for matching)
  time: string | null // Now nullable (legacy, not used for matching)
  variation_group_id: string | null // Reference to variation group for matching
  title: string
  body: string // Full post body (markdown)
  image_url: string | null
  video_url: string | null
  is_active: boolean
  last_used_at: string | null
  use_count: number
  status?: PostLibraryStatus // draft, approved, active (has DB default)
  source?: PostLibrarySource // manual, api, import (has DB default)
  approved_at?: string | null
  created_at: string
  updated_at: string
  // Joined data (optional)
  variation_group?: SkoolVariationGroup | null
}

/**
 * Execution log entry for audit trail (database row)
 */
export interface SkoolPostExecutionLog {
  id: string
  scheduler_id: string | null
  post_library_id: string | null
  oneoff_post_id: string | null
  executed_at: string
  status: SchedulerExecutionStatus
  skool_post_id: string | null
  skool_post_url: string | null
  error_message: string | null
  email_blast_sent: boolean
}

/**
 * Campaign for organizing one-off posts (database row)
 */
export interface SkoolCampaign {
  id: string
  name: string
  description: string | null
  start_date: string | null
  end_date: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/**
 * One-off scheduled post (database row)
 */
export interface SkoolOneOffPost {
  id: string
  group_slug: string
  category: string
  category_id: string | null
  scheduled_at: string
  timezone: string
  title: string
  body: string
  image_url: string | null
  video_url: string | null
  campaign_id: string | null
  send_email_blast: boolean
  status: OneOffPostStatus
  published_at: string | null
  skool_post_id: string | null
  skool_post_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
  // Joined data (optional)
  campaign?: SkoolCampaign | null
}

/**
 * Group settings including email blast tracking (database row)
 */
export interface SkoolGroupSettings {
  group_slug: string
  last_email_blast_at: string | null
  updated_at: string
}

/**
 * Input for creating a new variation group
 */
export interface SkoolVariationGroupInput {
  name: string
  description?: string | null
  is_active?: boolean
}

/**
 * Input for creating a new scheduled post
 */
export interface SkoolScheduledPostInput {
  group_slug?: string
  category: string
  category_id?: string | null
  day_of_week: DayOfWeek
  time: string
  variation_group_id?: string | null
  is_active?: boolean
  note?: string | null
}

/**
 * Input for creating a new post library item
 */
export interface SkoolPostLibraryItemInput {
  category?: string
  day_of_week?: DayOfWeek | null
  time?: string | null
  variation_group_id?: string | null
  title: string
  body: string
  image_url?: string | null
  video_url?: string | null
  is_active?: boolean
  status?: PostLibraryStatus
  source?: PostLibrarySource
}

/**
 * Input for creating a new campaign
 */
export interface SkoolCampaignInput {
  name: string
  description?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active?: boolean
}

/**
 * Input for creating a new one-off post
 */
export interface SkoolOneOffPostInput {
  group_slug?: string
  category: string
  category_id?: string | null
  scheduled_at: string
  timezone?: string
  title: string
  body: string
  image_url?: string | null
  video_url?: string | null
  campaign_id?: string | null
  send_email_blast?: boolean
  status?: OneOffPostStatus
}

/**
 * Input for logging an execution
 */
export interface SkoolPostExecutionLogInput {
  scheduler_id?: string | null
  post_library_id?: string | null
  oneoff_post_id?: string | null
  status: SchedulerExecutionStatus
  skool_post_id?: string | null
  skool_post_url?: string | null
  error_message?: string | null
  email_blast_sent?: boolean
}

/**
 * Stats returned by get_scheduler_stats function
 */
export interface SchedulerStats {
  total_executions: number
  successful_executions: number
  failed_executions: number
  skipped_executions: number
  last_execution_at: string | null
  last_status: SchedulerExecutionStatus | null
}

/**
 * Result from get_next_post_for_schedule function
 */
export interface NextPostResult {
  id: string
  title: string
  body: string
  image_url: string | null
  video_url: string | null
  use_count: number
}

/**
 * Result from get_due_schedules function
 */
export interface DueSchedule {
  id: string
  group_slug: string
  category: string
  category_id: string | null
  variation_group_id: string | null
  note: string | null
}

/**
 * Stats for a variation group
 */
export interface VariationGroupStats {
  post_count: number
  scheduler_count: number
}

/**
 * Stats for a campaign
 */
export interface CampaignStats {
  total_posts: number
  pending_posts: number
  published_posts: number
  failed_posts: number
}

/**
 * Email blast status for a group
 */
export interface EmailBlastStatus {
  available: boolean
  hours_until_available: number
  last_blast_at: string | null
}

/**
 * Helper to get day name from day_of_week number
 */
export function getDayName(dayOfWeek: DayOfWeek): DayName {
  return DAY_NAMES[dayOfWeek]
}

/**
 * Helper to format time for display (e.g., "09:00" -> "9:00 AM")
 */
export function formatScheduleTime(time: string): string {
  const parts = time.split(':')
  const hours = Number(parts[0]) || 0
  const minutes = Number(parts[1]) || 0
  const period = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`
}
