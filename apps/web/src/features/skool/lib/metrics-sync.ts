/**
 * Skool Metrics — DB Read Functions
 *
 * Reads Skool group KPI snapshots from the skool_metrics table.
 * Metrics are now written by the Chrome extension via /api/extension/* endpoints.
 */

import { db, eq, desc, asc, gte } from '@0ne/db/server'
import { skoolMetrics } from '@0ne/db/server'
import { DEFAULT_GROUP } from './config'

// =============================================================================
// TYPES
// =============================================================================

export interface SkoolMetricsSnapshot {
  group_slug: string
  snapshot_date: string
  members_total: number | null
  members_active: number | null
  community_activity: number | null
  category: string | null
  category_rank: number | null
  about_page_visits: number | null
  conversion_rate: number | null
}

/**
 * Get latest metrics for a group
 */
export async function getLatestMetrics(
  groupSlug: string = DEFAULT_GROUP.slug
): Promise<SkoolMetricsSnapshot | null> {
  const [data] = await db.select().from(skoolMetrics)
    .where(eq(skoolMetrics.groupSlug, groupSlug))
    .orderBy(desc(skoolMetrics.snapshotDate))
    .limit(1)

  if (!data) {
    return null
  }

  return {
    group_slug: data.groupSlug || '',
    snapshot_date: data.snapshotDate || '',
    members_total: data.membersTotal,
    members_active: data.membersActive,
    community_activity: data.communityActivity ? Number(data.communityActivity) : null,
    category: data.category,
    category_rank: data.categoryRank,
    about_page_visits: data.aboutPageVisits,
    conversion_rate: data.conversionRate ? Number(data.conversionRate) : null,
  }
}

/**
 * Get metrics history for a group
 */
export async function getMetricsHistory(
  groupSlug: string = DEFAULT_GROUP.slug,
  days: number = 30
): Promise<SkoolMetricsSnapshot[]> {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)
  const startDateStr = startDate.toISOString().split('T')[0]

  const data = await db.select().from(skoolMetrics)
    .where(eq(skoolMetrics.groupSlug, groupSlug))
    .orderBy(asc(skoolMetrics.snapshotDate))

  // Filter by date in JS since snapshotDate is a date type
  const filtered = data.filter((d) => (d.snapshotDate || '') >= startDateStr)

  return filtered.map((d) => ({
    group_slug: d.groupSlug || '',
    snapshot_date: d.snapshotDate || '',
    members_total: d.membersTotal,
    members_active: d.membersActive,
    community_activity: d.communityActivity ? Number(d.communityActivity) : null,
    category: d.category,
    category_rank: d.categoryRank,
    about_page_visits: d.aboutPageVisits,
    conversion_rate: d.conversionRate ? Number(d.conversionRate) : null,
  }))
}
