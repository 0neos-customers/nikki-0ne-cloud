import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, eq, desc, inArray } from '@0ne/db/server'
import { dmHandRaiserCampaigns, dmHandRaiserSent } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

interface HandRaiserCampaignWithStats {
  id: string
  clerkUserId: string | null
  postUrl: string
  skoolPostId: string | null
  keywordFilter: string | null
  dmTemplate: string | null
  ghlTag: string | null
  isActive: boolean | null
  createdAt: string
  updatedAt: string
  stats: {
    sentCount: number
    lastSentAt: string | null
  }
}

/**
 * GET /api/dm-sync/hand-raisers
 * List all hand-raiser campaigns with stats (sent DM count per campaign)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const activeOnly = searchParams.get('active_only') === 'true'

    const conditions: ReturnType<typeof eq>[] = []
    if (activeOnly) {
      conditions.push(eq(dmHandRaiserCampaigns.isActive, true))
    }

    const data = await db.select().from(dmHandRaiserCampaigns)
      .where(conditions.length > 0 ? conditions[0] : undefined)
      .orderBy(desc(dmHandRaiserCampaigns.createdAt))

    // Get stats for each campaign
    let campaignsWithStats: HandRaiserCampaignWithStats[] = []
    if (data.length > 0) {
      const campaignIds = data.map((c) => c.id)

      // Get sent DMs for each campaign
      const sentDms = await db.select({
        campaignId: dmHandRaiserSent.campaignId,
        sentAt: dmHandRaiserSent.sentAt,
      }).from(dmHandRaiserSent)
        .where(inArray(dmHandRaiserSent.campaignId, campaignIds))

      // Aggregate stats
      const statsMap = new Map<
        string,
        { sentCount: number; lastSentAt: string | null }
      >()

      sentDms.forEach((dm) => {
        if (!dm.campaignId) return
        const existing = statsMap.get(dm.campaignId) || {
          sentCount: 0,
          lastSentAt: null,
        }
        existing.sentCount++
        const sentAtStr = dm.sentAt?.toISOString() || null
        if (sentAtStr && (!existing.lastSentAt || sentAtStr > existing.lastSentAt)) {
          existing.lastSentAt = sentAtStr
        }
        statsMap.set(dm.campaignId, existing)
      })

      campaignsWithStats = data.map((campaign) => ({
        id: campaign.id,
        clerkUserId: campaign.clerkUserId,
        postUrl: campaign.postUrl,
        skoolPostId: campaign.skoolPostId,
        keywordFilter: campaign.keywordFilter,
        dmTemplate: campaign.dmTemplate,
        ghlTag: campaign.ghlTag,
        isActive: campaign.isActive,
        createdAt: campaign.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: campaign.updatedAt?.toISOString() || new Date().toISOString(),
        stats: statsMap.get(campaign.id) || { sentCount: 0, lastSentAt: null },
      }))
    }

    return NextResponse.json({ campaigns: campaignsWithStats })
  } catch (error) {
    console.error('[Hand-Raisers API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hand-raiser campaigns', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * POST /api/dm-sync/hand-raisers
 * Create a new hand-raiser campaign
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate required fields
    if (!body.post_url) {
      return NextResponse.json({ error: 'Missing required field: post_url' }, { status: 400 })
    }

    const [data] = await db.insert(dmHandRaiserCampaigns).values({
      clerkUserId: userId,
      postUrl: body.post_url,
      skoolPostId: body.skool_post_id || null,
      keywordFilter: body.keyword_filter || null,
      dmTemplate: body.dm_template || null,
      ghlTag: body.ghl_tag || null,
      isActive: body.is_active ?? true,
    }).returning()

    return NextResponse.json({ campaign: data }, { status: 201 })
  } catch (error) {
    console.error('[Hand-Raisers API] POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to create hand-raiser campaign', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/dm-sync/hand-raisers
 * Update an existing hand-raiser campaign
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    // Map snake_case body keys to camelCase schema keys
    const setData: Record<string, unknown> = { updatedAt: new Date() }
    if (updates.post_url !== undefined) setData.postUrl = updates.post_url
    if (updates.skool_post_id !== undefined) setData.skoolPostId = updates.skool_post_id
    if (updates.keyword_filter !== undefined) setData.keywordFilter = updates.keyword_filter
    if (updates.dm_template !== undefined) setData.dmTemplate = updates.dm_template
    if (updates.ghl_tag !== undefined) setData.ghlTag = updates.ghl_tag
    if (updates.is_active !== undefined) setData.isActive = updates.is_active

    const [data] = await db.update(dmHandRaiserCampaigns)
      .set(setData)
      .where(eq(dmHandRaiserCampaigns.id, id))
      .returning()

    if (!data) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign: data })
  } catch (error) {
    console.error('[Hand-Raisers API] PUT exception:', error)
    return NextResponse.json(
      { error: 'Failed to update hand-raiser campaign', details: String(error) },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/dm-sync/hand-raisers?id=xxx
 * Delete a hand-raiser campaign
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Missing id query parameter' }, { status: 400 })
    }

    try {
      await db.delete(dmHandRaiserCampaigns).where(eq(dmHandRaiserCampaigns.id, id))
    } catch (err) {
      console.error('[Hand-Raisers API] DELETE error:', err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Hand-Raisers API] DELETE exception:', error)
    return NextResponse.json(
      { error: 'Failed to delete hand-raiser campaign', details: String(error) },
      { status: 500 }
    )
  }
}
