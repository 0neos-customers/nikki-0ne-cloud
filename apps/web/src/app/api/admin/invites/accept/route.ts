import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'

export async function POST(request: NextRequest) {
  const { userId } = await auth.protect()
  const body = await request.json()
  const { invite_token } = body

  if (!invite_token) {
    return NextResponse.json({ error: 'invite_token required' }, { status: 400 })
  }

  const supabase = createServerClient()

  const { error } = await supabase
    .from('invites')
    .update({
      status: 'accepted',
      clerk_user_id: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq('invite_token', invite_token)
    .eq('status', 'pending')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
