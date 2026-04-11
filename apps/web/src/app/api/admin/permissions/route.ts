import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import {
  type AppId,
  DEFAULT_PERMISSIONS,
  getInstanceSlug,
  getUserPermissions,
  hasInstanceMembership,
  readPermissions,
  type UserPermissions,
} from '@0ne/auth'

type PublicMetadata = {
  permissions?: UserPermissions
  instances?: Record<string, UserPermissions>
} & Record<string, unknown>

export async function GET(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hostname = request.headers.get('host') || undefined
  const slug = getInstanceSlug(hostname)

  const permissions = await getUserPermissions(userId, slug)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const client = await clerkClient()
    const users = await client.users.getUserList({ limit: 100 })

    const members = users.data.filter((user) =>
      hasInstanceMembership(user.publicMetadata as PublicMetadata, slug),
    )

    const usersWithPermissions = members.map((user) => ({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      imageUrl: user.imageUrl,
      permissions: readPermissions(user.publicMetadata as PublicMetadata, slug) || DEFAULT_PERMISSIONS,
    }))

    return NextResponse.json({ users: usersWithPermissions })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const { userId } = await auth()

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const hostname = request.headers.get('host') || undefined
  const slug = getInstanceSlug(hostname)

  const permissions = await getUserPermissions(userId, slug)
  if (!permissions.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { targetUserId, appId, enabled, isAdmin } = body as {
      targetUserId: string
      appId?: AppId
      enabled?: boolean
      isAdmin?: boolean
    }

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId is required' },
        { status: 400 }
      )
    }

    const client = await clerkClient()
    const targetUser = await client.users.getUser(targetUserId)
    const targetMeta = (targetUser.publicMetadata as PublicMetadata) || {}

    if (!hasInstanceMembership(targetMeta, slug)) {
      return NextResponse.json(
        { error: 'Target user is not a member of this instance' },
        { status: 400 }
      )
    }

    const currentPermissions = readPermissions(targetMeta, slug)
    let updatedPermissions: UserPermissions = { ...currentPermissions }

    if (appId !== undefined && enabled !== undefined) {
      updatedPermissions = {
        ...updatedPermissions,
        apps: {
          ...updatedPermissions.apps,
          [appId]: enabled,
        },
      }
    }

    if (isAdmin !== undefined) {
      updatedPermissions = {
        ...updatedPermissions,
        isAdmin,
      }
    }

    const instances = {
      ...(targetMeta.instances || {}),
      [slug]: updatedPermissions,
    }

    await client.users.updateUser(targetUserId, {
      publicMetadata: {
        ...targetMeta,
        instances,
      },
    })

    return NextResponse.json({
      success: true,
      permissions: updatedPermissions,
    })
  } catch (error) {
    console.error('Error updating permissions:', error)
    return NextResponse.json(
      { error: 'Failed to update permissions' },
      { status: 500 }
    )
  }
}
