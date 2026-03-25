// Skool feature types — safe for client-side import (no db dependencies)

export interface SkoolMetricsSnapshot {
  groupSlug: string
  snapshotDate: string
  membersTotal: number | null
  membersActive: number | null
  communityActivity: number | null
  category: string | null
  categoryRank: number | null
  aboutPageVisits: number | null
  conversionRate: number | null
}
