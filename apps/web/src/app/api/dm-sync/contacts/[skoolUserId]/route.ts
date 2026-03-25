import { NextRequest, NextResponse } from 'next/server'
import { db, eq } from '@0ne/db/server'
import { dmContactMappings, skoolMembers } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

/**
 * PATCH /api/dm-sync/contacts/[skoolUserId]
 * Update contact fields: ghl_contact_id, email, phone, display_name, username
 */

interface ContactUpdate {
  ghl_contact_id?: string
  email?: string
  phone?: string
  display_name?: string
  username?: string
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ skoolUserId: string }> }
) {
  try {
    const { skoolUserId } = await params
    const body: ContactUpdate = await request.json()

    const now = new Date()

    // Build mapping update (dm_contact_mappings)
    const mappingUpdate: Record<string, unknown> = { updatedAt: now }
    // Build member update (skool_members)
    const memberUpdate: Record<string, unknown> = {}

    if (body.ghl_contact_id !== undefined) {
      const ghlId = body.ghl_contact_id.trim()
      if (!ghlId) {
        return NextResponse.json({ error: 'ghl_contact_id cannot be empty' }, { status: 400 })
      }
      mappingUpdate.ghlContactId = ghlId
      mappingUpdate.matchMethod = 'manual'
      memberUpdate.ghlContactId = ghlId
      memberUpdate.matchedAt = now
      memberUpdate.matchMethod = 'manual'
    }

    if (body.email !== undefined) {
      mappingUpdate.email = body.email.trim() || null
      memberUpdate.email = body.email.trim() || null
    }

    if (body.phone !== undefined) {
      mappingUpdate.phone = body.phone.trim() || null
      memberUpdate.phone = body.phone.trim() || null
    }

    if (body.display_name !== undefined) {
      mappingUpdate.skoolDisplayName = body.display_name.trim() || null
      memberUpdate.displayName = body.display_name.trim() || null
    }

    if (body.username !== undefined) {
      mappingUpdate.skoolUsername = body.username.trim() || null
      memberUpdate.skoolUsername = body.username.trim() || null
    }

    // Only proceed if there's something to update
    if (Object.keys(mappingUpdate).length <= 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Update dm_contact_mappings
    try {
      await db.update(dmContactMappings)
        .set(mappingUpdate)
        .where(eq(dmContactMappings.skoolUserId, skoolUserId))
    } catch (err) {
      console.error('[Contacts API] PATCH mapping error:', err)
      return NextResponse.json({ error: String(err) }, { status: 500 })
    }

    // Also update skool_members if there are member fields
    if (Object.keys(memberUpdate).length > 0) {
      await db.update(skoolMembers)
        .set(memberUpdate)
        .where(eq(skoolMembers.skoolUserId, skoolUserId))
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Contacts API] PATCH exception:', error)
    return NextResponse.json(
      { error: 'Failed to update contact', details: String(error) },
      { status: 500 }
    )
  }
}
