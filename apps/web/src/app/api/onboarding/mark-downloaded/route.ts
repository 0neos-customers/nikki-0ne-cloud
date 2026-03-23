import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'

export async function POST() {
  const { userId } = await auth.protect()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('user_installs')
    .update({
      status: 'downloaded',
      downloaded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('clerk_user_id', userId)
    .eq('status', 'pending')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
