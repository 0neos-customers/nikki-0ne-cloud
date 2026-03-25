import { NextRequest, NextResponse } from 'next/server'
import { db, eq, and } from '@0ne/db/server'
import { dmMessages } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

interface SendMessageRequest {
  message: string
  staffSkoolId: string
}

interface SendMessageResponse {
  success: boolean
  messageId: string
  status: 'pending'
}

/**
 * POST /api/dm-sync/conversations/[id]/send
 * Queue an outbound message for delivery via the Chrome extension
 *
 * Flow:
 * 1. Insert into dm_messages with status='pending', direction='outbound'
 * 2. Extension polls GET /api/extension/get-pending
 * 3. Extension delivers via Skool UI
 * 4. Extension confirms via POST /api/extension/confirm-sent
 * 5. Cron syncs to GHL
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params
    const body = await request.json() as SendMessageRequest

    const { message, staffSkoolId } = body

    // Validate required fields
    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID is required' },
        { status: 400 }
      )
    }

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    if (!staffSkoolId) {
      return NextResponse.json(
        { error: 'Staff Skool ID is required' },
        { status: 400 }
      )
    }

    // Get the participant's skool_user_id from an existing message in this conversation
    const [existingMessage] = await db.select({
      skoolUserId: dmMessages.skoolUserId,
      clerkUserId: dmMessages.clerkUserId,
    }).from(dmMessages)
      .where(and(
        eq(dmMessages.skoolConversationId, conversationId),
        eq(dmMessages.direction, 'inbound')
      ))
      .limit(1)

    if (!existingMessage) {
      return NextResponse.json(
        { error: 'Conversation not found or has no inbound messages' },
        { status: 404 }
      )
    }

    // Generate a synthetic skool_message_id for the outbound message
    // Format: inbox-{timestamp}-{random} to distinguish from real Skool IDs
    const syntheticMessageId = `inbox-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`

    // Insert the outbound message as pending
    try {
      const [newMessage] = await db.insert(dmMessages).values({
        clerkUserId: existingMessage.clerkUserId,
        skoolConversationId: conversationId,
        skoolMessageId: syntheticMessageId,
        skoolUserId: existingMessage.skoolUserId, // The recipient
        direction: 'outbound',
        messageText: message.trim(),
        status: 'pending',
        staffSkoolId: staffSkoolId,
        source: 'manual',
        createdAt: new Date(),
      }).returning({ id: dmMessages.id })

      console.log('[Send Message API] Queued message:', {
        messageId: newMessage.id,
        conversationId,
        syntheticMessageId,
      })

      return NextResponse.json({
        success: true,
        messageId: newMessage.id,
        status: 'pending',
      } as SendMessageResponse)
    } catch (insertError) {
      console.error('[Send Message API] INSERT error:', insertError)
      return NextResponse.json(
        { error: 'Failed to queue message', details: String(insertError) },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('[Send Message API] POST exception:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: String(error) },
      { status: 500 }
    )
  }
}
