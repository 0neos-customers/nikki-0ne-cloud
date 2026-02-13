import { AppShell } from '@/components/shell'

export default function SkoolSyncLayout({ children }: { children: React.ReactNode }) {
  return <AppShell appId="skoolSync">{children}</AppShell>
}
