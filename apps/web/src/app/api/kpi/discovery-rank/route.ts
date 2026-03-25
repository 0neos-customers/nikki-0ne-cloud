import { NextRequest, NextResponse } from 'next/server'
import { db, gte, lte, asc, and } from '@0ne/db/server'
import { skoolMetrics } from '@0ne/db/server'

/**
 * GET /api/kpi/discovery-rank
 *
 * Returns discovery ranking history from skool_metrics table.
 * Data is collected daily via the sync-skool cron job.
 *
 * Query params:
 *   - startDate: Start of date range (YYYY-MM-DD)
 *   - endDate: End of date range (YYYY-MM-DD)
 *   If not provided, defaults to last 30 days.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    // Use explicit dates if provided, otherwise default to last 30 days
    let startDate: string
    let endDate: string

    if (startDateParam && endDateParam) {
      startDate = startDateParam
      endDate = endDateParam
    } else {
      const now = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(now.getDate() - 30)
      startDate = thirtyDaysAgo.toISOString().split('T')[0]
      endDate = now.toISOString().split('T')[0]
    }

    const metrics = await db
      .select({
        snapshotDate: skoolMetrics.snapshotDate,
        categoryRank: skoolMetrics.categoryRank,
        category: skoolMetrics.category,
      })
      .from(skoolMetrics)
      .where(
        and(
          gte(skoolMetrics.snapshotDate, startDate),
          lte(skoolMetrics.snapshotDate, endDate),
        )
      )
      .orderBy(asc(skoolMetrics.snapshotDate))

    // Transform to expected format
    const history = metrics
      .filter((m) => m.categoryRank !== null)
      .map((m) => ({
        date: m.snapshotDate,
        rank: m.categoryRank,
        category: m.category || undefined,
      }))

    // Get current (most recent) rank
    const current =
      history.length > 0
        ? {
            rank: history[history.length - 1].rank,
            category: history[history.length - 1].category || 'Unknown',
          }
        : null

    return NextResponse.json({
      current,
      history,
    })
  } catch (error) {
    console.error('[Discovery Rank API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
