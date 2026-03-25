import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@0ne/db/server'
import { skoolMembers } from '@0ne/db/server'
import { ATTRIBUTION_SOURCE_LABELS } from '@0ne/db/types/kpi'

export const dynamic = 'force-dynamic'

export interface SourceWithCount {
  value: string
  label: string
  count: number
}

export async function GET() {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Query distinct attribution_source values with counts from skool_members
    const data = await db
      .select({ attributionSource: skoolMembers.attributionSource })
      .from(skoolMembers)

    // Count occurrences of each source
    const sourceCounts = new Map<string, number>()

    for (const row of data) {
      const source = row.attributionSource || 'unknown'
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1)
    }

    // Convert to array with labels, sorted by count (descending)
    const sources: SourceWithCount[] = Array.from(sourceCounts.entries())
      .map(([value, count]) => ({
        value,
        label: ATTRIBUTION_SOURCE_LABELS[value] || value,
        count,
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      sources,
      totalMembers: data.length,
    })
  } catch (error) {
    console.error('[Sources API] Error fetching sources:', error)
    return NextResponse.json({ error: 'Failed to fetch sources' }, { status: 500 })
  }
}
