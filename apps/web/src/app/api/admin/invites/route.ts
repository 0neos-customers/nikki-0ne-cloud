import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getInstanceSlug, getUserPermissions } from '@0ne/auth/permissions'
import { safeErrorResponse } from '@/lib/security'
import { db, eq, and, desc } from '@0ne/db/server'
import { invites } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { userId } = await auth.protect()
  const slug = getInstanceSlug(request.headers.get('host') || undefined)
  const permissions = await getUserPermissions(userId, slug)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const data = await db
      .select()
      .from(invites)
      .orderBy(desc(invites.createdAt))

    return NextResponse.json({ invites: data })
  } catch (error) {
    return safeErrorResponse('Failed to fetch invites', error)
  }
}

export async function POST(request: NextRequest) {
  const { userId } = await auth.protect()
  const slug = getInstanceSlug(request.headers.get('host') || undefined)
  const permissions = await getUserPermissions(userId, slug)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  const body = await request.json()
  const { email, name, source } = body

  if (!email) {
    return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  }

  try {
    // Check for existing pending invite
    const [existing] = await db
      .select({ id: invites.id, status: invites.status })
      .from(invites)
      .where(and(eq(invites.email, email.toLowerCase()), eq(invites.status, 'pending')))

    if (existing) {
      return NextResponse.json({ error: 'Pending invite already exists for this email' }, { status: 409 })
    }

    const [data] = await db
      .insert(invites)
      .values({
        email: email.toLowerCase(),
        name: name || null,
        source: source || 'manual',
      })
      .returning()

    return NextResponse.json({ invite: data })
  } catch (error) {
    return safeErrorResponse('Failed to create invite', error)
  }
}
