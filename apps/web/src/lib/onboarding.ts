export type OnboardingStep =
  | 'welcome'
  | 'system-check'
  | 'claude-account'
  | 'cloud-sync'
  | 'telegram'
  | 'voice'
  | 'ghl'
  | 'download'
  | 'verify'
  | 'complete'

export interface OnboardingStatus {
  hasInstallToken: boolean
  hasDownloaded: boolean
  isConnected: boolean
  isVerified: boolean
  installToken: string | null
  platform: string | null
  oneVersion: string | null
}

export const ONBOARDING_STEPS: { id: OnboardingStep; label: string; optional?: boolean }[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'system-check', label: 'System Check' },
  { id: 'claude-account', label: 'Claude' },
  { id: 'cloud-sync', label: 'Cloud Sync', optional: true },
  { id: 'telegram', label: 'Telegram', optional: true },
  { id: 'voice', label: 'Voice', optional: true },
  { id: 'ghl', label: 'GHL', optional: true },
  { id: 'download', label: 'Download' },
  { id: 'verify', label: 'Verify' },
  { id: 'complete', label: 'Complete' },
]
