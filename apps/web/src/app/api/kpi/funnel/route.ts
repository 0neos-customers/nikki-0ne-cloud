import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, eq, gte, lte, and, or, desc, inArray, isNull, isNotNull } from '@0ne/db/server'
import { contacts, skoolMembers } from '@0ne/db/server'
import {
  FUNNEL_STAGE_ORDER,
  STAGE_LABELS,
  STAGE_COLORS,
  type FunnelStage,
} from '@/features/kpi/lib/config'

export const dynamic = 'force-dynamic'

// Contact type for stage-based queries
interface ContactAtStage {
  id: string
  name: string
  email: string
  source: string
  daysInStage: number
  enteredAt: string
}

export async function GET(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || null
    // Support multiple sources via comma-separated string (attribution sources from skool_members)
    const sourcesParam = searchParams.get('sources')
    const sources = sourcesParam ? sourcesParam.split(',').filter(Boolean) : []
    const campaign = searchParams.get('campaign') || null
    const stage = searchParams.get('stage') || null
    const contactsLimit = parseInt(searchParams.get('contactsLimit') || '50')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')
    // Date range filters
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    // If sources filter is provided, get matching skool_user_ids from skool_members
    let skoolUserIds: string[] | null = null
    if (sources.length > 0) {
      const hasUnknown = sources.includes('unknown')
      const otherSources = sources.filter(s => s !== 'unknown')

      let sourceFilter
      if (hasUnknown && otherSources.length > 0) {
        sourceFilter = or(inArray(skoolMembers.attributionSource, otherSources), isNull(skoolMembers.attributionSource))
      } else if (hasUnknown) {
        sourceFilter = isNull(skoolMembers.attributionSource)
      } else {
        sourceFilter = inArray(skoolMembers.attributionSource, otherSources)
      }

      const skoolMembersData = await db
        .select({ skoolUserId: skoolMembers.skoolUserId })
        .from(skoolMembers)
        .where(sourceFilter)

      skoolUserIds = skoolMembersData.map(m => m.skoolUserId).filter(Boolean)
    }

    // Build contact query filters
    if (skoolUserIds !== null && skoolUserIds.length === 0) {
      // No matching skool members, return empty results
      return NextResponse.json({
        funnel: {
          stages: FUNNEL_STAGE_ORDER.map(stageId => ({
            id: stageId,
            name: STAGE_LABELS[stageId],
            count: 0,
            color: STAGE_COLORS[stageId],
            conversionRate: null,
          })),
          totalContacts: 0,
          overallConversion: 0,
        },
        contacts: [],
        pagination: { total: 0, limit, offset, hasMore: false },
        filters: { sources: [], campaigns: [], stages: FUNNEL_STAGE_ORDER.map(s => ({ id: s, name: STAGE_LABELS[s] })) },
        sourceFilteringNote: 'No contacts found matching the selected attribution sources.',
      })
    }

    const contactFilters = []
    if (skoolUserIds !== null) {
      contactFilters.push(inArray(contacts.skoolUserId, skoolUserIds))
    } else if (source) {
      contactFilters.push(eq(contacts.source, source))
    }
    if (campaign) {
      contactFilters.push(eq(contacts.campaign, campaign))
    }
    if (stage) {
      contactFilters.push(eq(contacts.currentStage, stage))
    }
    if (startDate) {
      contactFilters.push(gte(contacts.createdAt, new Date(startDate)))
    }
    if (endDate) {
      contactFilters.push(lte(contacts.createdAt, new Date(endDate + 'T23:59:59')))
    }

    const whereClause = contactFilters.length > 0 ? and(...contactFilters) : undefined

    // Get count
    const contactsCountResult = await db
      .select({ id: contacts.id })
      .from(contacts)
      .where(whereClause)

    const totalContacts = contactsCountResult.length

    // Get paginated data
    const contactsData = await db
      .select()
      .from(contacts)
      .where(whereClause)
      .orderBy(desc(contacts.createdAt))
      .limit(limit)
      .offset(offset)

    // Get stage counts (without pagination) - reuse same filters minus pagination
    const stageCountFilters = []
    if (skoolUserIds !== null && skoolUserIds.length > 0) {
      stageCountFilters.push(inArray(contacts.skoolUserId, skoolUserIds))
    } else if (source) {
      stageCountFilters.push(eq(contacts.source, source))
    }
    if (campaign) {
      stageCountFilters.push(eq(contacts.campaign, campaign))
    }
    if (startDate) {
      stageCountFilters.push(gte(contacts.createdAt, new Date(startDate)))
    }
    if (endDate) {
      stageCountFilters.push(lte(contacts.createdAt, new Date(endDate + 'T23:59:59')))
    }

    const stageWhereClause = stageCountFilters.length > 0 ? and(...stageCountFilters) : undefined
    const allContacts = await db
      .select({ currentStage: contacts.currentStage })
      .from(contacts)
      .where(stageWhereClause)

    // Calculate stage counts - initialize from FUNNEL_STAGE_ORDER
    const stageCounts: Record<FunnelStage, number> = Object.fromEntries(
      FUNNEL_STAGE_ORDER.map((stage) => [stage, 0])
    ) as Record<FunnelStage, number>

    allContacts.forEach((contact) => {
      const contactStage = contact.currentStage as FunnelStage
      if (contactStage && stageCounts[contactStage] !== undefined) {
        stageCounts[contactStage]++
      }
    })

    // Build funnel stages with conversion rates
    const funnelStages = [...FUNNEL_STAGE_ORDER].reverse().map((stageId, index, arr) => {
      const count = stageCounts[stageId]
      const previousStageCount = index > 0 ? stageCounts[arr[index - 1]] : null
      const conversionRate = previousStageCount && previousStageCount > 0
        ? ((count / previousStageCount) * 100)
        : null

      return {
        id: stageId,
        name: STAGE_LABELS[stageId],
        count,
        color: STAGE_COLORS[stageId],
        conversionRate: conversionRate ? Number(conversionRate.toFixed(1)) : null,
      }
    })

    // Get source breakdown
    const sourceBreakdown = await db
      .select({ source: contacts.source })
      .from(contacts)

    const sourceCountMap: Record<string, number> = {}
    sourceBreakdown.forEach((c) => {
      const src = c.source || 'Unknown'
      sourceCountMap[src] = (sourceCountMap[src] || 0) + 1
    })

    const sourcesList = Object.entries(sourceCountMap)
      .map(([name, cnt]) => ({ name, count: cnt }))
      .sort((a, b) => b.count - a.count)

    // Get campaign breakdown
    const campaignBreakdown = await db
      .select({ campaign: contacts.campaign })
      .from(contacts)
      .where(isNotNull(contacts.campaign))

    const campaignCountMap: Record<string, number> = {}
    campaignBreakdown.forEach((c) => {
      if (c.campaign) {
        campaignCountMap[c.campaign] = (campaignCountMap[c.campaign] || 0) + 1
      }
    })

    const campaigns = Object.entries(campaignCountMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    // Calculate overall conversion (member → client [vip + premium])
    const totalMembers = stageCounts.member
    const totalClients = stageCounts.vip + stageCounts.premium

    // Get contacts by stage if a specific stage is requested
    // Returns top N contacts at the specified stage with name, email, source, daysInStage
    let contactsByStage: ContactAtStage[] = []
    if (stage) {
      // First get contacts at the requested stage
      const stageContactFilters = [
        eq(contacts.currentStage, stage),
      ]
      if (skoolUserIds !== null && skoolUserIds.length > 0) {
        stageContactFilters.push(inArray(contacts.skoolUserId, skoolUserIds))
      }

      const stageContacts = await db
        .select({
          id: contacts.id,
          skoolUserId: contacts.skoolUserId,
          createdAt: contacts.createdAt,
          becameHandRaiserAt: contacts.becameHandRaiserAt,
          becameQualifiedAt: contacts.becameQualifiedAt,
          becameClientAt: contacts.becameClientAt,
        })
        .from(contacts)
        .where(and(...stageContactFilters))
        .orderBy(desc(contacts.createdAt))
        .limit(contactsLimit)

      if (stageContacts.length > 0) {
        // Get the skool user IDs to fetch member details
        const contactSkoolIds = stageContacts
          .map((c) => c.skoolUserId)
          .filter(Boolean) as string[]

        // Fetch member info from skool_members
        const skoolMembersData = contactSkoolIds.length > 0 ? await db
          .select({
            skoolUserId: skoolMembers.skoolUserId,
            displayName: skoolMembers.displayName,
            email: skoolMembers.email,
            attributionSource: skoolMembers.attributionSource,
          })
          .from(skoolMembers)
          .where(inArray(skoolMembers.skoolUserId, contactSkoolIds))
          : []

        // Create a map for quick lookup
        const memberMap = new Map(
          skoolMembersData.map((m) => [m.skoolUserId, m])
        )

        // Build the response
        const now = new Date()
        contactsByStage = stageContacts.map((contact) => {
          const member = memberMap.get(contact.skoolUserId || '')

          // Determine when they entered this stage
          let enteredAt: Date = contact.createdAt!
          if (stage === 'hand_raiser' && contact.becameHandRaiserAt) {
            enteredAt = contact.becameHandRaiserAt
          } else if (stage === 'qualified' && contact.becameQualifiedAt) {
            enteredAt = contact.becameQualifiedAt
          } else if ((stage === 'vip' || stage === 'premium') && contact.becameClientAt) {
            enteredAt = contact.becameClientAt
          }

          // Calculate days in stage
          const enteredDate = new Date(enteredAt)
          const daysInStage = Math.floor(
            (now.getTime() - enteredDate.getTime()) / (1000 * 60 * 60 * 24)
          )

          return {
            id: contact.id,
            name: member?.displayName || 'Unknown',
            email: member?.email || '',
            source: member?.attributionSource || 'Unknown',
            daysInStage,
            enteredAt: enteredDate.toISOString().split('T')[0],
          }
        })
      }
    }

    const response = {
      funnel: {
        stages: funnelStages,
        totalContacts: allContacts?.length || 0,
        overallConversion: totalMembers > 0
          ? Number(((totalClients / totalMembers) * 100).toFixed(2))
          : 0,
      },
      contacts: contactsData.map((c) => ({
        id: c.id,
        ghlContactId: c.ghlContactId,
        stage: c.currentStage,
        stageName: STAGE_LABELS[c.currentStage as FunnelStage] || c.currentStage,
        source: c.source || 'Unknown',
        campaign: c.campaign,
        creditStatus: c.creditStatus,
        leadAge: c.leadAge,
        clientAge: c.clientAge,
        createdAt: c.createdAt?.toISOString(),
        updatedAt: c.updatedAt?.toISOString(),
      })),
      pagination: {
        total: totalContacts || 0,
        limit,
        offset,
        hasMore: (totalContacts || 0) > offset + limit,
      },
      filters: {
        sources: sourcesList,
        campaigns,
        stages: FUNNEL_STAGE_ORDER.map((s) => ({
          id: s,
          name: STAGE_LABELS[s],
        })),
      },
      // Contacts at the specified stage (only returned if stage param is set)
      contactsByStage: stage ? contactsByStage : undefined,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('KPI Funnel error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch funnel data', details: String(error) },
      { status: 500 }
    )
  }
}
