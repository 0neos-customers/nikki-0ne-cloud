import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getUserPermissions } from '@0ne/auth/permissions'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth.protect()
  const permissions = await getUserPermissions(userId)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invites: data })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth.protect()
  const permissions = await getUserPermissions(userId)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { email, name, source } = body

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  const supabase = createServerClient()

  // Check for existing pending invite
  const { data: existing } = await supabase
    .from('invites')
    .select('id, status')
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single()

  if (existing) {
    return NextResponse.json({ error: 'Pending invite already exists for this email' }, { status: 409 })
  }

  const { data, error } = await supabase
    .from('invites')
    .insert({
      email: email.toLowerCase(),
      name: name || null,
      source: source || 'manual',
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ invite: data })
}
