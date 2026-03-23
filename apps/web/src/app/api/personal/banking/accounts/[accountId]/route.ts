import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ accountId: string }> }
) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { accountId } = await params
    const body = await request.json()
    const supabase = createServerClient()

    // Build update object from allowed fields only
    const update: Record<string, unknown> = {}
    if (typeof body.is_hidden === 'boolean') {
      update.is_hidden = body.is_hidden
    }
    if (body.scope === 'personal' || body.scope === 'business' || body.scope === null) {
      update.scope = body.scope
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    update.updated_at = new Date().toISOString()

    const { error } = await supabase
      .from('plaid_accounts')
      .update(update)
      .eq('id', accountId)

    if (error) {
      return NextResponse.json(
        { error: 'Failed to update account', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Account PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update account', details: String(error) },
      { status: 500 }
    )
  }
}
