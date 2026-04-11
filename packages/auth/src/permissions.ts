import { clerkClient, currentUser } from '@clerk/nextjs/server'

export type AppId = 'kpi' | 'prospector' | 'skoolSync' | 'skoolScheduler' | 'ghlMedia' | 'personal'

export interface UserPermissions {
  apps: Record<AppId, boolean>
  isAdmin: boolean
}

export const DEFAULT_PERMISSIONS: UserPermissions = {
  apps: {
    kpi: false,
    prospector: false,
    skoolSync: false,
    skoolScheduler: false,
    ghlMedia: false,
    personal: false,
  },
  isAdmin: false,
}

const CONTROL_PLANE_SLUG = 'app'

type PublicMetadata = {
  permissions?: UserPermissions
  instances?: Record<string, UserPermissions>
} & Record<string, unknown>

export function getInstanceSlug(hostname?: string): string {
  const envSlug = process.env.NEXT_PUBLIC_INSTANCE_SLUG
  if (envSlug) return envSlug

  const host = hostname
  if (!host) return CONTROL_PLANE_SLUG

  if (host.startsWith('localhost')) return CONTROL_PLANE_SLUG
  if (host === 'app.0neos.com' || host === '0neos.com' || host === 'www.0neos.com') {
    return CONTROL_PLANE_SLUG
  }
  const parts = host.split('.')
  if (parts.length >= 3 && parts.slice(-2).join('.') === '0neos.com') {
    return parts[0] || CONTROL_PLANE_SLUG
  }
  return CONTROL_PLANE_SLUG
}

export function hasInstanceMembership(
  publicMetadata: PublicMetadata | null | undefined,
  slug: string,
): boolean {
  if (!publicMetadata) return false
  if (publicMetadata.instances?.[slug]) return true
  if (slug === CONTROL_PLANE_SLUG && publicMetadata.permissions) return true
  return false
}

export function readPermissions(
  publicMetadata: PublicMetadata | null | undefined,
  slug: string,
): UserPermissions {
  const namespaced = publicMetadata?.instances?.[slug]
  if (namespaced) return namespaced
  if (slug === CONTROL_PLANE_SLUG && publicMetadata?.permissions) {
    return publicMetadata.permissions
  }
  return DEFAULT_PERMISSIONS
}

export async function getUserPermissions(userId: string, slug?: string): Promise<UserPermissions> {
  try {
    const client = await clerkClient()
    const user = await client.users.getUser(userId)
    return readPermissions(user.publicMetadata as PublicMetadata, slug || getInstanceSlug())
  } catch {
    return DEFAULT_PERMISSIONS
  }
}

export async function canAccessApp(userId: string, appId: AppId, slug?: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId, slug)
  return permissions.isAdmin || permissions.apps[appId] || false
}

export async function getCurrentUserPermissions(slug?: string): Promise<UserPermissions | null> {
  const user = await currentUser()
  if (!user) return null
  return getUserPermissions(user.id, slug)
}

export async function setUserPermissions(
  userId: string,
  permissions: UserPermissions,
  slug?: string,
): Promise<void> {
  const client = await clerkClient()
  const effectiveSlug = slug || getInstanceSlug()
  const user = await client.users.getUser(userId)
  const existing = (user.publicMetadata as PublicMetadata) || {}
  const instances = { ...(existing.instances || {}), [effectiveSlug]: permissions }

  await client.users.updateUserMetadata(userId, {
    publicMetadata: {
      ...existing,
      instances,
    },
  })
}

export async function enableAppForUser(userId: string, appId: AppId, slug?: string): Promise<void> {
  const permissions = await getUserPermissions(userId, slug)
  permissions.apps[appId] = true
  await setUserPermissions(userId, permissions, slug)
}

export async function disableAppForUser(userId: string, appId: AppId, slug?: string): Promise<void> {
  const permissions = await getUserPermissions(userId, slug)
  permissions.apps[appId] = false
  await setUserPermissions(userId, permissions, slug)
}

export function getEnabledApps(permissions: UserPermissions): AppId[] {
  return (Object.entries(permissions.apps) as [AppId, boolean][])
    .filter(([, enabled]) => enabled)
    .map(([appId]) => appId)
}
