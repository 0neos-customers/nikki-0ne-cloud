import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'

export async function POST() {
  const { userId } = await auth.protect()
  const supabase = createServerClient()

  // Check if user already has an install record
  const { data: existing } = await supabase
    .from('user_installs')
    .select('install_token, status')
    .eq('clerk_user_id', userId)
    .single()

  if (existing) {
    return NextResponse.json({
      install_token: existing.install_token,
      status: existing.status,
    })
  }

  // Create new install record
  const { data, error } = await supabase
    .from('user_installs')
    .insert({ clerk_user_id: userId })
    .select('install_token')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Store token in Clerk metadata for quick access
  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { installToken: data.install_token },
  })

  return NextResponse.json({
    install_token: data.install_token,
    status: 'pending',
  })
}
