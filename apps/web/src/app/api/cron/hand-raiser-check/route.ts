/**
 * Hand-Raiser Check Cron Endpoint
 *
 * Checks monitored posts for new comments and queues auto-DMs.
 * Runs every 15 minutes via Vercel Cron.
 *
 * Manual invocation:
 * curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/hand-raiser-check"
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  processHandRaisers,
  getUsersWithActiveHandRaisers,
  type HandRaiserResult,
} from '@/features/dm-sync'
import { SyncLogger } from '@/lib/sync-log'

export const maxDuration = 300 // 5 minutes max

/**
 * GET /api/cron/hand-raiser-check
 *
 * Checks monitored Skool posts for new comments and queues auto-DMs.
 *
 * Query params:
 * - user_id: Optional - process only for specific user
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const specificUserId = searchParams.get('user_id')

  const startTime = Date.now()

  // Check for active campaigns BEFORE starting sync log
  // This prevents creating log entries when there's nothing to process
  const users = await getUsersWithActiveHandRaisers()

  if (users.length === 0) {
    console.log('[hand-raiser-check] No active campaigns - skipping')
    return NextResponse.json({
      success: true,
      message: 'No active hand-raiser campaigns',
      skipped: true,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    })
  }

  // Filter to specific user if requested
  const targetUsers = specificUserId
    ? users.filter((u) => u.user_id === specificUserId)
    : users

  if (targetUsers.length === 0) {
    console.log('[hand-raiser-check] No matching users - skipping')
    return NextResponse.json({
      success: true,
      message: 'No matching users',
      skipped: true,
      duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
    })
  }

  // Only start sync log when we actually have work to do
  console.log('[hand-raiser-check] Starting hand-raiser processing')
  const syncLogger = new SyncLogger('hand_raiser')
  await syncLogger.start({ source: 'cron' })

  try {

    console.log(`[hand-raiser-check] Processing ${targetUsers.length} users`)

    // Process each user's hand-raisers
    const results: Array<{
      userId: string
      result: HandRaiserResult
    }> = []

    for (const user of targetUsers) {
      try {
        console.log(`[hand-raiser-check] Processing user: ${user.user_id}`)
        const result = await processHandRaisers(user.user_id)
        results.push({
          userId: user.user_id,
          result,
        })
      } catch (error) {
        console.error(
          `[hand-raiser-check] Error processing user ${user.user_id}:`,
          error instanceof Error ? error.message : error
        )
        results.push({
          userId: user.user_id,
          result: {
            campaignsProcessed: 0,
            commentsChecked: 0,
            dmsSent: 0,
            errors: 1,
            errorDetails: [
              {
                error: error instanceof Error ? error.message : String(error),
              },
            ],
          },
        })
      }
    }

    // Aggregate results
    const totals = results.reduce(
      (acc, r) => ({
        campaignsProcessed: acc.campaignsProcessed + r.result.campaignsProcessed,
        commentsChecked: acc.commentsChecked + r.result.commentsChecked,
        dmsSent: acc.dmsSent + r.result.dmsSent,
        errors: acc.errors + r.result.errors,
      }),
      { campaignsProcessed: 0, commentsChecked: 0, dmsSent: 0, errors: 0 }
    )

    const duration = ((Date.now() - startTime) / 1000).toFixed(1)
    console.log(
      `[hand-raiser-check] Completed in ${duration}s: campaigns=${totals.campaignsProcessed}, comments=${totals.commentsChecked}, dms=${totals.dmsSent}, errors=${totals.errors}`
    )

    if (totals.errors === 0) {
      await syncLogger.complete(totals.dmsSent, {
        campaignsProcessed: totals.campaignsProcessed,
        commentsChecked: totals.commentsChecked,
      })
    } else {
      await syncLogger.fail(`${totals.errors} errors during processing`, totals.dmsSent)
    }

    return NextResponse.json({
      success: totals.errors === 0,
      duration: `${duration}s`,
      totals,
      users: results.map((r) => ({
        userId: r.userId,
        campaignsProcessed: r.result.campaignsProcessed,
        commentsChecked: r.result.commentsChecked,
        dmsSent: r.result.dmsSent,
        errors: r.result.errors,
      })),
    })
  } catch (error) {
    console.error('[hand-raiser-check] Fatal error:', error)
    await syncLogger.fail(error instanceof Error ? error.message : 'Unknown error')
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s`,
      },
      { status: 500 }
    )
  }
}
