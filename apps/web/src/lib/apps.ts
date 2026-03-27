import { type LucideIcon } from 'lucide-react'
import type { AppId } from '@0ne/auth/permissions'

export interface AppConfig {
  id: AppId
  name: string
  description: string
  icon: LucideIcon
  href: string
  color: string
}

export type { AppId } from '@0ne/auth/permissions'

export const APPS: AppConfig[] = []

export function getAppById(id: AppId): AppConfig | undefined {
  return APPS.find((app) => app.id === id)
}

export interface AppNavItem {
  name: string
  href: string
  icon: LucideIcon
}

export function getAppNavigation(appId: string): AppNavItem[] {
  return []
}
