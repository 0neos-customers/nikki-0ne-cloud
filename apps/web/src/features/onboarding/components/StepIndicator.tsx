'use client'

import type { OnboardingStep } from '@/lib/onboarding'

interface StepInfo {
  id: OnboardingStep
  label: string
}

interface StepIndicatorProps {
  steps: StepInfo[]
  currentIndex: number
}

export function StepIndicator({ steps, currentIndex }: StepIndicatorProps) {
  // Show a simplified view — current step name + progress counter
  const current = steps[currentIndex]

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center gap-1">
        {steps.map((step, i) => (
          <div
            key={step.id}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < currentIndex
                ? 'bg-primary'
                : i === currentIndex
                  ? 'bg-primary'
                  : 'bg-border'
            }`}
          />
        ))}
      </div>

      {/* Step label */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Step {currentIndex + 1} of {steps.length}
        </p>
        <p className="text-sm font-medium">
          {current?.label}
        </p>
      </div>
    </div>
  )
}
