'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator } from '@/features/onboarding/components/StepIndicator'
import { WelcomeStep } from '@/features/onboarding/steps/WelcomeStep'
import { SystemCheckStep } from '@/features/onboarding/steps/SystemCheckStep'
import { ClaudeAccountStep } from '@/features/onboarding/steps/ClaudeAccountStep'
import { TelegramStep } from '@/features/onboarding/steps/TelegramStep'
import { VoiceStep } from '@/features/onboarding/steps/VoiceStep'
import { DownloadStep } from '@/features/onboarding/steps/DownloadStep'
import { VerifyStep } from '@/features/onboarding/steps/VerifyStep'
import { CompleteStep } from '@/features/onboarding/steps/CompleteStep'
import { ONBOARDING_STEPS, type OnboardingStep } from '@/lib/onboarding'

// Token state persisted across steps
export interface TokenState {
  [key: string]: string
}

const STEP_COMPONENTS: Record<OnboardingStep, React.ComponentType<StepProps>> = {
  'welcome': WelcomeStep,
  'system-check': SystemCheckStep,
  'claude-account': ClaudeAccountStep,
  'cloud-sync': () => null,  // Handled inline in system-check
  'telegram': TelegramStep,
  'voice': VoiceStep,
  'ghl': () => null,  // Skipped for MVP — optional
  'download': DownloadStep,
  'verify': VerifyStep,
  'complete': CompleteStep,
}

// Steps actually shown in the wizard (slack + ai-services moved to skill-level onboarding)
const VISIBLE_STEPS: OnboardingStep[] = [
  'welcome',
  'system-check',
  'claude-account',
  'telegram',
  'voice',
  'download',
  'verify',
  'complete',
]

export interface StepProps {
  onNext: () => void
  onBack: () => void
  tokens: TokenState
  setToken: (key: string, value: string) => void
  isFirst: boolean
  isLast: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [tokens, setTokens] = useState<TokenState>({})

  const currentStepId = VISIBLE_STEPS[currentIndex]

  const handleNext = useCallback(() => {
    if (currentIndex < VISIBLE_STEPS.length - 1) {
      setCurrentIndex(i => i + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentIndex])

  const handleBack = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentIndex])

  const setToken = useCallback((key: string, value: string) => {
    setTokens(prev => ({ ...prev, [key]: value }))
  }, [])

  const StepComponent = STEP_COMPONENTS[currentStepId]

  if (!StepComponent) return null

  return (
    <div className="space-y-8">
      <StepIndicator
        steps={VISIBLE_STEPS.map(id => {
          const step = ONBOARDING_STEPS.find(s => s.id === id)
          return { id, label: step?.label || id }
        })}
        currentIndex={currentIndex}
      />

      <StepComponent
        onNext={handleNext}
        onBack={handleBack}
        tokens={tokens}
        setToken={setToken}
        isFirst={currentIndex === 0}
        isLast={currentIndex === VISIBLE_STEPS.length - 1}
      />
    </div>
  )
}
