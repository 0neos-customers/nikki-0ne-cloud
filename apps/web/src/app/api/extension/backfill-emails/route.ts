import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import { corsHeaders, validateExtensionAuth } from '@/lib/extension-auth'
import { GHLClient } from '@/features/kpi/lib/ghl-client'

export { OPTIONS } from '@/lib/extension-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes for full backfill

/**
 * POST /api/extension/backfill-emails
 *
 * One-time backfill: extract emails/phones from existing survey_answers
 * in skool_members, update both skool_members and dm_contact_mappings,
 * and auto-match unmatched members against GHL.
 *
 * Also backfills display names from skool_members to dm_contact_mappings
 * where dm_contact_mappings has username-style names.
 */

// =============================================
// Survey extraction (same logic as push-members)
// =============================================

function extractEmailFromSurvey(qa: unknown): string | null {
  if (!qa || !Array.isArray(qa)) return null
  for (const item of qa) {
    const answer = (item?.answer || '') as string
    if (answer.includes('@') && answer.includes('.')) {
      const emailMatch = answer.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/)
      if (emailMatch) return emailMatch[0].toLowerCase()
    }
  }
  return null
}

function extractPhoneFromSurvey(qa: unknown): string | null {
  if (!qa || !Array.isArray(qa)) return null
  for (const item of qa) {
    const question = ((item?.question || '') as string).toLowerCase()
    const answer = (item?.answer || '') as string
    if (question.includes('phone') || question.includes('cell') || question.includes('mobile') || question.includes('whatsapp')) {
      const digits = answer.replace(/\D/g, '')
      if (digits.length >= 10) {
        return digits.length === 10 ? `+1${digits}` : `+${digits}`
      }
    }
  }
  return null
}

function normalizeSurveyAnswers(raw: unknown): unknown[] | null {
  if (!raw) return null
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'object' && 'survey' in (raw as Record<string, unknown>)) {
    const inner = (raw as { survey: unknown }).survey
    if (Array.isArray(inner)) return inner
  }
  return null
}

export async function POST(request: NextRequest) {
  const authResult = await validateExtensionAuth(request)
  if (!authResult.valid) {
    return NextResponse.json({ error: authResult.error }, { status: 401, headers: corsHeaders })
  }

  try {
    const supabase = createServerClient()
    const stats = {
      members_scanned: 0,
      emails_extracted: 0,
      phones_extracted: 0,
      mappings_updated: 0,
      ghl_matched: 0,
      names_fixed: 0,
    }

    // =========================================================================
    // Step 1: Extract emails/phones from survey_answers in skool_members
    // =========================================================================

    // Get all members with survey_answers
    const { data: membersWithSurvey, error: fetchError } = await supabase
      .from('skool_members')
      .select('skool_user_id, survey_answers, email, phone, display_name')
      .not('survey_answers', 'is', null)

    if (fetchError) {
      console.error('[Backfill] Error fetching members:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500, headers: corsHeaders })
    }

    console.log(`[Backfill] Found ${membersWithSurvey?.length || 0} members with survey answers`)
    stats.members_scanned = membersWithSurvey?.length || 0

    for (const member of membersWithSurvey || []) {
      const survey = normalizeSurveyAnswers(member.survey_answers)
      const surveyEmail = extractEmailFromSurvey(survey)
      const surveyPhone = extractPhoneFromSurvey(survey)
      const updates: Record<string, unknown> = {}

      // Only update if we found something AND the member doesn't already have it
      if (surveyEmail && !member.email) {
        updates.email = surveyEmail
        stats.emails_extracted++
      }
      if (surveyPhone && !member.phone) {
        updates.phone = surveyPhone
        stats.phones_extracted++
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from('skool_members')
          .update(updates)
          .eq('skool_user_id', member.skool_user_id)
      }
    }

    console.log(`[Backfill] Extracted ${stats.emails_extracted} emails, ${stats.phones_extracted} phones from surveys`)

    // =========================================================================
    // Step 2: Sync emails/phones/names from skool_members → dm_contact_mappings
    // =========================================================================

    // Get all skool_members with email or phone
    const { data: membersWithData } = await supabase
      .from('skool_members')
      .select('skool_user_id, email, phone, display_name')
      .or('email.not.is.null,phone.not.is.null')

    // Get all dm_contact_mappings
    const { data: allMappings } = await supabase
      .from('dm_contact_mappings')
      .select('skool_user_id, email, phone, skool_display_name')

    const mappingMap = new Map(allMappings?.map((m) => [m.skool_user_id, m]) || [])

    for (const member of membersWithData || []) {
      const mapping = mappingMap.get(member.skool_user_id)
      if (!mapping) continue

      const mappingUpdates: Record<string, unknown> = {}

      // Backfill email to mapping if missing
      if (member.email && !mapping.email) {
        mappingUpdates.email = member.email
      }
      // Backfill phone to mapping if missing
      if (member.phone && !mapping.phone) {
        mappingUpdates.phone = member.phone
      }
      // Fix name: if mapping has a username-style name, use the real display name
      if (member.display_name && mapping.skool_display_name) {
        // Username-style names contain hyphens and end with digits (e.g., "george-wilkerson-8010")
        const isUsernameName = /^[a-z]+-[a-z]+-\d+$/i.test(mapping.skool_display_name)
        const memberNameLooksReal = !/^[a-z]+-[a-z]+-\d+$/i.test(member.display_name)
        if (isUsernameName && memberNameLooksReal) {
          mappingUpdates.skool_display_name = member.display_name
          stats.names_fixed++
        }
      }

      if (Object.keys(mappingUpdates).length > 0) {
        mappingUpdates.updated_at = new Date().toISOString()
        await supabase
          .from('dm_contact_mappings')
          .update(mappingUpdates)
          .eq('skool_user_id', member.skool_user_id)
        stats.mappings_updated++
      }
    }

    console.log(`[Backfill] Updated ${stats.mappings_updated} dm_contact_mappings (${stats.names_fixed} names fixed)`)

    // =========================================================================
    // Step 3: Auto-match unmatched members with email against GHL
    // =========================================================================

    const { data: unmatchedWithEmail } = await supabase
      .from('skool_members')
      .select('skool_user_id, email, display_name, skool_username')
      .is('ghl_contact_id', null)
      .not('email', 'is', null)

    if (unmatchedWithEmail && unmatchedWithEmail.length > 0) {
      console.log(`[Backfill] Auto-matching ${unmatchedWithEmail.length} unmatched members with email...`)

      try {
        const ghl = new GHLClient()
        const MAX_MATCHES = 100 // Process more during backfill

        for (const member of unmatchedWithEmail.slice(0, MAX_MATCHES)) {
          if (!member.email) continue

          try {
            const contact = await ghl.searchContactByEmail(member.email)
            if (contact) {
              // Update skool_members
              await supabase
                .from('skool_members')
                .update({
                  ghl_contact_id: contact.id,
                  matched_at: new Date().toISOString(),
                  match_method: 'email',
                })
                .eq('skool_user_id', member.skool_user_id)

              // Update dm_contact_mappings
              const clerkUserId = authResult.userId || authResult.skoolUserId || ''
              await supabase
                .from('dm_contact_mappings')
                .update({
                  ghl_contact_id: contact.id,
                  match_method: 'email',
                  email: member.email,
                  updated_at: new Date().toISOString(),
                })
                .eq('skool_user_id', member.skool_user_id)

              stats.ghl_matched++
              console.log(`[Backfill] Matched ${member.email} → GHL ${contact.id}`)
            }

            // Rate limit
            await new Promise((r) => setTimeout(r, 200))
          } catch (matchError) {
            console.error(`[Backfill] Match error for ${member.email}:`, matchError)
          }
        }

        if (unmatchedWithEmail.length > MAX_MATCHES) {
          console.log(`[Backfill] ${unmatchedWithEmail.length - MAX_MATCHES} remaining — run again`)
        }
      } catch (ghlError) {
        console.error('[Backfill] GHL client error:', ghlError)
      }
    }

    console.log(`[Backfill] Complete:`, stats)

    return NextResponse.json({ success: true, stats }, { headers: corsHeaders })
  } catch (error) {
    console.error('[Backfill] Exception:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
