import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')

  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('invites')
    .select('id, email, name, status, expires_at')
    .eq('invite_token', token)
    .single()

  if (error || !data) {
    return NextResponse.json({ valid: false, error: 'Invalid invite' }, { status: 404 })
  }

  if (data.status !== 'pending') {
    return NextResponse.json({ valid: false, error: `Invite is ${data.status}` }, { status: 410 })
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: 'Invite has expired' }, { status: 410 })
  }

  return NextResponse.json({
    valid: true,
    invite: { email: data.email, name: data.name },
  })
}
