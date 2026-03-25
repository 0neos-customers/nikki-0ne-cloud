import { NextRequest, NextResponse } from 'next/server'
import { db, eq, desc, and, or, count, inArray, ilike } from '@0ne/db/server'
import { dmMessages, dmContactMappings, dmSyncConfig } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

interface RawMessage {
  id: string
  skool_conversation_id: string
  skool_message_id: string
  skool_user_id: string
  sender_name: string | null
  skool_username: string | null
  direction: 'inbound' | 'outbound'
  message_text: string | null
  status: 'synced' | 'pending' | 'failed'
  ghl_message_id: string | null
  ghl_contact_id: string | null
  ghl_location_id: string | null
  skool_community_slug: string | null
  created_at: string
  synced_at: string | null
}

interface RawMessagesResponse {
  messages: RawMessage[]
  summary: {
    total: number
    inbound: number
    outbound: number
    synced: number
    pending: number
    failed: number
  }
  pagination: {
    limit: number
    offset: number
    hasMore: boolean
  }
}

/**
 * GET /api/dm-sync/raw-messages
 * List raw DM messages captured by the extension
 * Query params: search, direction, status, conversation_id, limit, offset
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')?.trim() || ''
    const direction = searchParams.get('direction') // 'inbound' | 'outbound' | 'all'
    const status = searchParams.get('status') // 'synced' | 'pending' | 'failed' | 'all'
    const conversationId = searchParams.get('conversation_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = []

    if (search) {
      conditions.push(
        or(
          ilike(dmMessages.messageText, `%${search}%`),
          ilike(dmMessages.senderName, `%${search}%`)
        )!
      )
    }

    if (direction && direction !== 'all') {
      conditions.push(eq(dmMessages.direction, direction))
    }

    if (status && status !== 'all') {
      conditions.push(eq(dmMessages.status, status))
    }

    if (conversationId) {
      conditions.push(eq(dmMessages.skoolConversationId, conversationId))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get filtered count
    const [{ count: filteredCount }] = await db.select({ count: count() }).from(dmMessages)
      .where(whereClause)

    // Get paginated results
    const messages = await db.select().from(dmMessages)
      .where(whereClause)
      .orderBy(desc(dmMessages.createdAt))
      .limit(limit)
      .offset(offset)

    // Get summary stats (unfiltered totals for dashboard)
    const allMessages = await db.select({
      direction: dmMessages.direction,
      status: dmMessages.status,
    }).from(dmMessages)

    const summary = {
      total: allMessages.length,
      inbound: allMessages.filter((m) => m.direction === 'inbound').length,
      outbound: allMessages.filter((m) => m.direction === 'outbound').length,
      synced: allMessages.filter((m) => m.status === 'synced').length,
      pending: allMessages.filter((m) => m.status === 'pending').length,
      failed: allMessages.filter((m) => m.status === 'failed').length,
    }

    // Enrich messages with contact mapping and sync config data
    if (messages.length > 0) {
      // Get unique skool_user_ids and user_ids
      const skoolUserIds = [...new Set(messages.map((m) => m.skoolUserId).filter(Boolean))] as string[]
      const userIds = [...new Set(messages.map((m) => m.clerkUserId).filter(Boolean))] as string[]

      // Get contact mappings for these users
      const mappings = skoolUserIds.length > 0
        ? await db.select({
            skoolUserId: dmContactMappings.skoolUserId,
            skoolUsername: dmContactMappings.skoolUsername,
            ghlContactId: dmContactMappings.ghlContactId,
          }).from(dmContactMappings).where(inArray(dmContactMappings.skoolUserId, skoolUserIds))
        : []

      // Get sync configs for location and community slug
      const configs = userIds.length > 0
        ? await db.select({
            clerkUserId: dmSyncConfig.clerkUserId,
            ghlLocationId: dmSyncConfig.ghlLocationId,
            skoolCommunitySlug: dmSyncConfig.skoolCommunitySlug,
          }).from(dmSyncConfig).where(inArray(dmSyncConfig.clerkUserId, userIds))
        : []

      // Build lookup maps
      const mappingMap = new Map(
        mappings.map((m) => [m.skoolUserId, m])
      )
      const configMap = new Map(
        configs.map((c) => [c.clerkUserId, c])
      )

      // Enrich messages
      const enrichedMessages: RawMessage[] = messages.map((msg) => {
        const mapping = msg.skoolUserId ? mappingMap.get(msg.skoolUserId) : undefined
        const config = msg.clerkUserId ? configMap.get(msg.clerkUserId) : undefined

        return {
          id: msg.id,
          skool_conversation_id: msg.skoolConversationId || '',
          skool_message_id: msg.skoolMessageId || '',
          skool_user_id: msg.skoolUserId || '',
          sender_name: msg.senderName,
          skool_username: mapping?.skoolUsername || null,
          direction: msg.direction as 'inbound' | 'outbound',
          message_text: msg.messageText,
          status: msg.status as 'synced' | 'pending' | 'failed',
          ghl_message_id: msg.ghlMessageId,
          ghl_contact_id: mapping?.ghlContactId || null,
          ghl_location_id: config?.ghlLocationId || null,
          skool_community_slug: config?.skoolCommunitySlug || null,
          created_at: msg.createdAt?.toISOString() || new Date().toISOString(),
          synced_at: msg.syncedAt?.toISOString() || null,
        }
      })

      return NextResponse.json({
        messages: enrichedMessages,
        summary,
        pagination: {
          limit,
          offset,
          hasMore: Number(filteredCount || 0) > offset + limit,
        },
      } as RawMessagesResponse)
    }

    return NextResponse.json({
      messages: [],
      summary,
      pagination: {
        limit,
        offset,
        hasMore: false,
      },
    } as RawMessagesResponse)
  } catch (error) {
    console.error('[Raw Messages API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch raw messages', details: String(error) },
      { status: 500 }
    )
  }
}
