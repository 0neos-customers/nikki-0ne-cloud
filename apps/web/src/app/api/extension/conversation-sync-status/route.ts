import { NextRequest, NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

// CORS headers for Chrome extension
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Clerk-User-Id',
}

/**
 * OPTIONS /api/extension/conversation-sync-status
 * Handle CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
}

/**
 * Conversation Sync Status API
 *
 * Returns sync status for given conversation IDs
 * Used by the extension to know which conversations have been synced
 * and where to resume from for incremental sync.
 */

// =============================================
// Types
// =============================================

interface ConversationSyncState {
  conversationId: string
  participantName?: string
  lastSyncedMessageId: string | null
  lastSyncedMessageTime: string | null
  backfillComplete: boolean
  lastSyncTime: number
  totalMessagesSynced: number
}

interface GetSyncStatusRequest {
  staffSkoolId: string
  conversationIds: string[]
}

interface GetSyncStatusResponse {
  success: boolean
  conversations: ConversationSyncState[]
  error?: string
}

// =============================================
// Auth Helper
// =============================================

interface AuthResult {
  valid: boolean
  authType: 'clerk' | 'apiKey' | null
  userId?: string
  skoolUserId?: string
  error?: string
}

async function validateExtensionAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get('authorization')

  if (!authHeader) {
    return { valid: false, authType: null, error: 'Missing Authorization header' }
  }

  // Check for Clerk auth first (Clerk <token>)
  if (authHeader.startsWith('Clerk ')) {
    try {
      const { userId } = await auth()
      if (userId) {
        const client = await clerkClient()
        const user = await client.users.getUser(userId)
        const skoolUserId = (user.publicMetadata?.skoolUserId as string) || undefined

        return { valid: true, authType: 'clerk', userId, skoolUserId }
      }
      return { valid: false, authType: 'clerk', error: 'Invalid or expired Clerk session' }
    } catch {
      return { valid: false, authType: 'clerk', error: 'Failed to validate Clerk session' }
    }
  }

  // Check for Bearer token (API key)
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i)
  if (bearerMatch) {
    const expectedKey = process.env.EXTENSION_API_KEY
    if (!expectedKey) {
      console.error('[Extension API] EXTENSION_API_KEY environment variable not set')
      return { valid: false, authType: 'apiKey', error: 'Server configuration error' }
    }

    if (bearerMatch[1] === expectedKey) {
      return { valid: true, authType: 'apiKey' }
    }
    return { valid: false, authType: 'apiKey', error: 'Invalid API key' }
  }

  return { valid: false, authType: null, error: 'Invalid Authorization header format' }
}

// =============================================
// POST /api/extension/conversation-sync-status
// =============================================

export async function POST(request: NextRequest) {
  // Validate auth
  const authResult = await validateExtensionAuth(request)
  if (!authResult.valid) {
    return NextResponse.json(
      { success: false, conversations: [], error: authResult.error },
      { status: 401, headers: corsHeaders }
    )
  }

  try {
    const body: GetSyncStatusRequest = await request.json()

    // If using Clerk auth and staffSkoolId not provided, use linked Skool ID
    if (authResult.authType === 'clerk' && !body.staffSkoolId && authResult.skoolUserId) {
      body.staffSkoolId = authResult.skoolUserId
    }

    // Validate request
    if (!body.staffSkoolId?.trim()) {
      return NextResponse.json(
        { success: false, conversations: [], error: 'Missing required field: staffSkoolId' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!Array.isArray(body.conversationIds)) {
      return NextResponse.json(
        { success: false, conversations: [], error: 'conversationIds must be an array' },
        { status: 400, headers: corsHeaders }
      )
    }

    const { staffSkoolId, conversationIds } = body

    console.log(
      `[Extension API] Getting sync status for ${conversationIds.length} conversations (staff: ${staffSkoolId})`
    )

    // If no conversation IDs provided, return empty array
    if (conversationIds.length === 0) {
      return NextResponse.json(
        { success: true, conversations: [] } as GetSyncStatusResponse,
        { headers: corsHeaders }
      )
    }

    const supabase = createServerClient()

    // Fetch sync status for all requested conversations
    const { data, error } = await supabase
      .from('conversation_sync_status')
      .select('*')
      .eq('staff_skool_id', staffSkoolId)
      .in('conversation_id', conversationIds)

    if (error) {
      console.error('[Extension API] Error fetching sync status:', error)
      return NextResponse.json(
        { success: false, conversations: [], error: error.message },
        { status: 500, headers: corsHeaders }
      )
    }

    // Map database rows to response format
    const conversations: ConversationSyncState[] = (data || []).map((row) => ({
      conversationId: row.conversation_id,
      participantName: row.participant_name || undefined,
      lastSyncedMessageId: row.last_synced_message_id,
      lastSyncedMessageTime: row.last_synced_message_time,
      backfillComplete: row.backfill_complete ?? false,
      lastSyncTime: row.last_sync_time ? new Date(row.last_sync_time).getTime() : Date.now(),
      totalMessagesSynced: row.total_messages_synced ?? 0,
    }))

    console.log(
      `[Extension API] Returning sync status for ${conversations.length} conversations`
    )

    const response: GetSyncStatusResponse = {
      success: true,
      conversations,
    }

    return NextResponse.json(response, { headers: corsHeaders })
  } catch (error) {
    console.error('[Extension API] POST exception:', error)
    return NextResponse.json(
      {
        success: false,
        conversations: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      } as GetSyncStatusResponse,
      { status: 500, headers: corsHeaders }
    )
  }
}
