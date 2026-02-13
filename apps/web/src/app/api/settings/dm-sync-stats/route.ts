/**
 * DM Sync Stats API
 *
 * Returns DM sync metrics for the dashboard.
 *
 * GET /api/settings/dm-sync-stats
 *   - Returns inbound/outbound message counts (24h), total mappings, pending queue
 */

import { NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

interface DMSyncStats {
  inbound24h: number
  outbound24h: number
  totalMappings: number
  pendingQueue: number
}

export async function GET() {
  try {
    const supabase = createServerClient()

    // Calculate 24 hours ago
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    // Run all queries in parallel
    const [inboundResult, outboundResult, mappingsResult, pendingResult] = await Promise.all([
      // Inbound messages in last 24h
      supabase
        .from('dm_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'inbound')
        .gte('created_at', twentyFourHoursAgo),

      // Outbound messages in last 24h
      supabase
        .from('dm_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'outbound')
        .gte('created_at', twentyFourHoursAgo),

      // Total contact mappings
      supabase
        .from('dm_contact_mappings')
        .select('id', { count: 'exact', head: true }),

      // Pending outbound messages (status = 'pending')
      supabase
        .from('dm_messages')
        .select('id', { count: 'exact', head: true })
        .eq('direction', 'outbound')
        .eq('status', 'pending'),
    ])

    // Check for errors
    if (inboundResult.error) {
      console.error('[dm-sync-stats API] Inbound query error:', inboundResult.error)
    }
    if (outboundResult.error) {
      console.error('[dm-sync-stats API] Outbound query error:', outboundResult.error)
    }
    if (mappingsResult.error) {
      console.error('[dm-sync-stats API] Mappings query error:', mappingsResult.error)
    }
    if (pendingResult.error) {
      console.error('[dm-sync-stats API] Pending query error:', pendingResult.error)
    }

    const stats: DMSyncStats = {
      inbound24h: inboundResult.count ?? 0,
      outbound24h: outboundResult.count ?? 0,
      totalMappings: mappingsResult.count ?? 0,
      pendingQueue: pendingResult.count ?? 0,
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('[dm-sync-stats API] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    )
  }
}
