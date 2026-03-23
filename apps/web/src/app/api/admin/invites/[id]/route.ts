import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserPermissions } from '@0ne/auth/permissions'
import { createServerClient } from '@0ne/db/server'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth.protect()
  const permissions = await getUserPermissions(userId)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const { id } = await params
  const supabase = createServerClient()

  const { error } = await supabase
    .from('invites')
    .update({ status: 'revoked' })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
