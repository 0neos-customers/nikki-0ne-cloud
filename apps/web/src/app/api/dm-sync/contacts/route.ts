import { NextRequest, NextResponse } from 'next/server'
import { db, eq, desc, and, or, count, inArray, isNull, isNotNull, ilike } from '@0ne/db/server'
import { dmContactMappings, dmMessages, dmSyncConfig, contactChannels as contactChannelsTable, skoolMembers, staffUsers as staffUsersTable } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

interface ContactChannelInfo {
  staff_skool_id: string
  skool_channel_id: string
  staff_display_name: string | null
}

interface ContactActivity {
  id: string
  skool_user_id: string
  skool_username: string | null
  skool_display_name: string | null
  ghl_contact_id: string | null
  match_method: 'skool_id' | 'email' | 'name' | 'synthetic' | 'manual' | 'no_email' | 'skool_members' | null
  email: string | null
  phone: string | null
  contact_type: 'community_member' | 'dm_contact' | 'unknown' | null
  created_at: string
  skool_conversation_id: string | null
  channels: ContactChannelInfo[]
  stats: {
    inbound_count: number
    outbound_count: number
    synced_count: number
    pending_count: number
    failed_count: number
    last_activity_at: string | null
  }
  survey_answers: Array<{ question: string; answer: string }> | null
  ghl_location_id: string
  skool_community_slug: string
}

interface ContactActivityResponse {
  contacts: ContactActivity[]
  summary: {
    total_contacts: number
    matched_contacts: number
    unmatched_contacts: number
    total_messages: number
    contacts_with_pending: number
    contacts_with_failed: number
  }
  total: number
}

/**
 * GET /api/dm-sync/contacts
 * List all contacts with sync activity stats
 * Uses server-side pagination for efficiency with thousands of contacts
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    const search = searchParams.get('search')?.trim() || ''
    const matchMethod = searchParams.get('match_method')
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const matchStatus = searchParams.get('match_status') || 'all'
    const contactType = searchParams.get('contact_type') || 'all'

    // =========================================================================
    // 1. Get summary counts (fast, separate queries, no row limit)
    // =========================================================================

    // Total matched
    const [{ count: matchedCount }] = await db.select({ count: count() }).from(dmContactMappings)
      .where(isNotNull(dmContactMappings.ghlContactId))

    // Total unmatched
    const [{ count: unmatchedCount }] = await db.select({ count: count() }).from(dmContactMappings)
      .where(isNull(dmContactMappings.ghlContactId))

    // Total messages
    const [{ count: totalMessages }] = await db.select({ count: count() }).from(dmMessages)

    // Contacts with pending
    const pendingContacts = await db.select({ skoolUserId: dmMessages.skoolUserId })
      .from(dmMessages)
      .where(eq(dmMessages.status, 'pending'))

    const uniquePending = new Set(pendingContacts.map((m) => m.skoolUserId))

    // Contacts with failed
    const failedContacts = await db.select({ skoolUserId: dmMessages.skoolUserId })
      .from(dmMessages)
      .where(eq(dmMessages.status, 'failed'))

    const uniqueFailed = new Set(failedContacts.map((m) => m.skoolUserId))

    const summary = {
      total_contacts: Number(matchedCount || 0) + Number(unmatchedCount || 0),
      matched_contacts: Number(matchedCount || 0),
      unmatched_contacts: Number(unmatchedCount || 0),
      total_messages: Number(totalMessages || 0),
      contacts_with_pending: uniquePending.size,
      contacts_with_failed: uniqueFailed.size,
    }

    // =========================================================================
    // 2. Get paginated contacts (server-side pagination)
    // =========================================================================

    // Build where conditions
    const conditions: ReturnType<typeof eq>[] = []

    if (search) {
      conditions.push(
        or(
          ilike(dmContactMappings.skoolUsername, `%${search}%`),
          ilike(dmContactMappings.skoolDisplayName, `%${search}%`)
        )!
      )
    }

    if (matchMethod && matchMethod !== 'all') {
      conditions.push(eq(dmContactMappings.matchMethod, matchMethod))
    }

    if (matchStatus === 'matched') {
      conditions.push(isNotNull(dmContactMappings.ghlContactId))
    } else if (matchStatus === 'unmatched') {
      conditions.push(isNull(dmContactMappings.ghlContactId))
    }

    if (contactType && contactType !== 'all') {
      conditions.push(eq(dmContactMappings.contactType, contactType))
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined

    // Get total filtered count
    const [{ count: filteredCount }] = await db.select({ count: count() }).from(dmContactMappings)
      .where(whereClause)

    // Get paginated results
    const mappings = await db.select().from(dmContactMappings)
      .where(whereClause)
      .orderBy(desc(dmContactMappings.createdAt))
      .limit(limit)
      .offset(offset)

    if (mappings.length === 0) {
      return NextResponse.json({ contacts: [], summary, total: Number(filteredCount || 0) } as ContactActivityResponse)
    }

    // =========================================================================
    // 3. Enrich page contacts with message stats + conversation IDs
    // =========================================================================

    // Get sync config for ghl_location_id and skool_community_slug
    const userIds = [...new Set(mappings.map((m) => m.clerkUserId).filter(Boolean))] as string[]
    const syncConfigs = userIds.length > 0
      ? await db.select({
          clerkUserId: dmSyncConfig.clerkUserId,
          ghlLocationId: dmSyncConfig.ghlLocationId,
          skoolCommunitySlug: dmSyncConfig.skoolCommunitySlug,
        }).from(dmSyncConfig).where(inArray(dmSyncConfig.clerkUserId, userIds))
      : []

    const configMap = new Map<string, { ghl_location_id: string; skool_community_slug: string }>()
    syncConfigs.forEach((config) => {
      if (config.clerkUserId) {
        configMap.set(config.clerkUserId, {
          ghl_location_id: config.ghlLocationId || '',
          skool_community_slug: config.skoolCommunitySlug || '',
        })
      }
    })

    // Only fetch messages for this page's contacts (max 50 IDs, efficient)
    const pageSkoolUserIds = mappings.map((m) => m.skoolUserId).filter(Boolean) as string[]

    const messages = pageSkoolUserIds.length > 0
      ? await db.select({
          skoolUserId: dmMessages.skoolUserId,
          direction: dmMessages.direction,
          status: dmMessages.status,
          createdAt: dmMessages.createdAt,
          skoolConversationId: dmMessages.skoolConversationId,
        }).from(dmMessages).where(inArray(dmMessages.skoolUserId, pageSkoolUserIds))
      : []

    // Fetch contact_channels for this page's contacts
    const contactChannelsData = pageSkoolUserIds.length > 0
      ? await db.select({
          skoolUserId: contactChannelsTable.skoolUserId,
          staffSkoolId: contactChannelsTable.staffSkoolId,
          skoolChannelId: contactChannelsTable.skoolChannelId,
        }).from(contactChannelsTable).where(inArray(contactChannelsTable.skoolUserId, pageSkoolUserIds))
      : []

    // Fetch survey_answers, email, phone from skool_members for this page's contacts
    const memberData = pageSkoolUserIds.length > 0
      ? await db.select({
          skoolUserId: skoolMembers.skoolUserId,
          surveyAnswers: skoolMembers.surveyAnswers,
          email: skoolMembers.email,
          phone: skoolMembers.phone,
        }).from(skoolMembers).where(inArray(skoolMembers.skoolUserId, pageSkoolUserIds))
      : []

    const surveyMap = new Map<string, Array<{ question: string; answer: string }> | null>()
    const memberEmailMap = new Map<string, string | null>()
    const memberPhoneMap = new Map<string, string | null>()
    memberData.forEach((m) => {
      // Normalize: survey data can be array directly or nested {survey: [...]}
      let answers = m.surveyAnswers as unknown
      if (answers && typeof answers === 'object' && !Array.isArray(answers) && 'survey' in (answers as Record<string, unknown>)) {
        answers = (answers as { survey: unknown }).survey
      }
      const normalizedAnswers = Array.isArray(answers) ? answers as Array<{ question: string; answer: string }> : null
      surveyMap.set(m.skoolUserId, normalizedAnswers)

      // Email: use stored email, or extract from survey answers on-the-fly
      let email = m.email || null
      if (!email && normalizedAnswers) {
        for (const item of normalizedAnswers) {
          const ans = item.answer || ''
          if (ans.includes('@') && ans.includes('.')) {
            const match = ans.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
            if (match) { email = match[0].toLowerCase(); break }
          }
        }
      }
      memberEmailMap.set(m.skoolUserId, email)

      // Phone: use stored phone, or extract from survey answers on-the-fly
      let phone = m.phone || null
      if (!phone && normalizedAnswers) {
        for (const item of normalizedAnswers) {
          const q = (item.question || '').toLowerCase()
          const ans = item.answer || ''
          if (q.includes('phone') || q.includes('cell') || q.includes('mobile') || q.includes('whatsapp')) {
            const digits = ans.replace(/\D/g, '')
            if (digits.length >= 10) {
              phone = digits.length === 10 ? `+1${digits}` : `+${digits}`
              break
            }
          }
        }
      }
      memberPhoneMap.set(m.skoolUserId, phone)
    })

    // Build channels map per user (with staff display name lookup)
    const channelsMap = new Map<string, ContactChannelInfo[]>()

    // Get staff display names
    const staffIds = [...new Set(contactChannelsData.map((c) => c.staffSkoolId).filter(Boolean))] as string[]
    const staffNameMap = new Map<string, string | null>()
    if (staffIds.length > 0) {
      const staffData = await db.select({
        skoolUserId: staffUsersTable.skoolUserId,
        displayName: staffUsersTable.displayName,
      }).from(staffUsersTable).where(inArray(staffUsersTable.skoolUserId, staffIds))

      staffData.forEach((s) => staffNameMap.set(s.skoolUserId, s.displayName))
    }

    contactChannelsData.forEach((ch) => {
      if (!ch.skoolUserId) return
      const existing = channelsMap.get(ch.skoolUserId) || []
      existing.push({
        staff_skool_id: ch.staffSkoolId || '',
        skool_channel_id: ch.skoolChannelId || '',
        staff_display_name: ch.staffSkoolId ? staffNameMap.get(ch.staffSkoolId) || null : null,
      })
      channelsMap.set(ch.skoolUserId, existing)
    })

    // Aggregate message stats per user
    const statsMap = new Map<string, {
      inbound_count: number
      outbound_count: number
      synced_count: number
      pending_count: number
      failed_count: number
      last_activity_at: string | null
    }>()

    // Build conversation ID map (most recent per user)
    const conversationMap = new Map<string, string>()

    messages.forEach((msg) => {
      if (!msg.skoolUserId) return
      // Stats
      const existing = statsMap.get(msg.skoolUserId) || {
        inbound_count: 0, outbound_count: 0,
        synced_count: 0, pending_count: 0, failed_count: 0,
        last_activity_at: null,
      }

      if (msg.direction === 'inbound') existing.inbound_count++
      else if (msg.direction === 'outbound') existing.outbound_count++

      if (msg.status === 'synced') existing.synced_count++
      else if (msg.status === 'pending') existing.pending_count++
      else if (msg.status === 'failed') existing.failed_count++

      const createdAtStr = msg.createdAt?.toISOString() || null
      if (createdAtStr && (!existing.last_activity_at || createdAtStr > existing.last_activity_at)) {
        existing.last_activity_at = createdAtStr
      }

      statsMap.set(msg.skoolUserId, existing)

      // Conversation ID (most recent)
      if (msg.skoolConversationId) {
        const currentConvo = conversationMap.get(msg.skoolUserId)
        if (!currentConvo) {
          conversationMap.set(msg.skoolUserId, msg.skoolConversationId)
        }
      }
    })

    // =========================================================================
    // 4. Build response
    // =========================================================================

    let contactsWithStats: ContactActivity[] = mappings.map((mapping) => {
      const skoolUserId = mapping.skoolUserId || ''
      const stats = statsMap.get(skoolUserId) || {
        inbound_count: 0, outbound_count: 0,
        synced_count: 0, pending_count: 0, failed_count: 0,
        last_activity_at: null,
      }

      const config = mapping.clerkUserId ? configMap.get(mapping.clerkUserId) : undefined

      return {
        id: mapping.id,
        skool_user_id: skoolUserId,
        skool_username: mapping.skoolUsername,
        skool_display_name: mapping.skoolDisplayName,
        ghl_contact_id: mapping.ghlContactId,
        match_method: mapping.matchMethod as ContactActivity['match_method'],
        email: mapping.email || memberEmailMap.get(skoolUserId) || null,
        phone: mapping.phone || memberPhoneMap.get(skoolUserId) || null,
        contact_type: (mapping.contactType as ContactActivity['contact_type']) || null,
        created_at: mapping.createdAt?.toISOString() || new Date().toISOString(),
        skool_conversation_id: conversationMap.get(skoolUserId) || null,
        channels: channelsMap.get(skoolUserId) || [],
        stats,
        survey_answers: surveyMap.get(skoolUserId) || null,
        ghl_location_id: config?.ghl_location_id || '',
        skool_community_slug: config?.skool_community_slug || '',
      }
    })

    // Apply status filter (post-aggregation since it depends on message stats)
    if (status && status !== 'all') {
      if (status === 'pending') {
        contactsWithStats = contactsWithStats.filter((c) => c.stats.pending_count > 0)
      } else if (status === 'failed') {
        contactsWithStats = contactsWithStats.filter((c) => c.stats.failed_count > 0)
      } else if (status === 'synced') {
        contactsWithStats = contactsWithStats.filter(
          (c) => c.stats.synced_count > 0 && c.stats.pending_count === 0 && c.stats.failed_count === 0
        )
      }
    }

    return NextResponse.json({ contacts: contactsWithStats, summary, total: Number(filteredCount || 0) } as ContactActivityResponse)
  } catch (error) {
    console.error('[Contacts API] GET exception:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact activity', details: String(error) },
      { status: 500 }
    )
  }
}
