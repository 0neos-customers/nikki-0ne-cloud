import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'
import { corsHeaders, validateExtensionAuth } from '@/lib/extension-auth'

export { OPTIONS } from '@/lib/extension-auth'

export const dynamic = 'force-dynamic'

// =============================================
// Types
// =============================================

interface PushChannelRequest {
  clerkUserId: string
  skoolUserId: string
  staffSkoolId: string
  skoolChannelId: string
}

interface PushChannelResponse {
  success: boolean
  cached: boolean
  error?: string
}

// =============================================
// POST /api/extension/push-channel
// =============================================

/**
 * Cache a resolved Skool channel ID for a staff+user pair.
 * Also updates any dm_messages with placeholder conversation IDs
 * (hr-pending-*, pending-*) to the real channel ID.
 */
export async function POST(request: NextRequest) {
  const authResult = await validateExtensionAuth(request)
  if (!authResult.valid) {
    return NextResponse.json(
      { error: authResult.error },
      { status: 401, headers: corsHeaders }
    )
  }

  try {
    const body: PushChannelRequest = await request.json()

    if (!body.clerkUserId || !body.skoolUserId || !body.staffSkoolId || !body.skoolChannelId) {
      return NextResponse.json(
        { error: 'Missing required fields: clerkUserId, skoolUserId, staffSkoolId, skoolChannelId' },
        { status: 400, headers: corsHeaders }
      )
    }

    console.log(
      `[Extension API] Caching channel ${body.skoolChannelId} for staff ${body.staffSkoolId} → user ${body.skoolUserId}`
    )

    const supabase = createServerClient()

    // Upsert into contact_channels
    const { error: upsertError } = await supabase
      .from('contact_channels')
      .upsert(
        {
          clerk_user_id: body.clerkUserId,
          skool_user_id: body.skoolUserId,
          staff_skool_id: body.staffSkoolId,
          skool_channel_id: body.skoolChannelId,
          resolved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'clerk_user_id,skool_user_id,staff_skool_id' }
      )

    if (upsertError) {
      console.error('[Extension API] Failed to cache channel:', upsertError)
      return NextResponse.json(
        { success: false, cached: false, error: upsertError.message },
        { status: 500, headers: corsHeaders }
      )
    }

    // Update dm_messages with placeholder conversation IDs for this user
    const placeholders = [
      `hr-pending-${body.skoolUserId}`,
      `pending-${body.skoolUserId}`,
    ]

    const { data: updated, error: updateError } = await supabase
      .from('dm_messages')
      .update({ skool_conversation_id: body.skoolChannelId })
      .in('skool_conversation_id', placeholders)
      .eq('skool_user_id', body.skoolUserId)
      .eq('staff_skool_id', body.staffSkoolId)
      .select('id')

    if (updateError) {
      console.error('[Extension API] Failed to update placeholder messages:', updateError)
      // Non-fatal — channel was still cached
    } else if (updated && updated.length > 0) {
      console.log(
        `[Extension API] Updated ${updated.length} placeholder messages with real channel ID`
      )
    }

    const response: PushChannelResponse = {
      success: true,
      cached: true,
    }

    return NextResponse.json(response, { headers: corsHeaders })
  } catch (error) {
    console.error('[Extension API] POST push-channel exception:', error)
    return NextResponse.json(
      {
        success: false,
        cached: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500, headers: corsHeaders }
    )
  }
}
