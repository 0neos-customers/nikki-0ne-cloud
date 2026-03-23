'use client'

import { Button } from '@0ne/ui'
import { ExternalLink } from 'lucide-react'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function ClaudeAccountStep({ onNext, onBack }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Claude Subscription</h2>
        <p className="text-muted-foreground mt-1">
          Claude is the AI that powers everything. You need an active subscription.
        </p>
      </div>

      <a
        href="https://claude.com/pricing"
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-border bg-card p-6 hover:border-primary/30 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-lg">Claude Pro or Max</p>
            <p className="text-muted-foreground mt-1">$20-200/mo — your AI subscription</p>
          </div>
          <ExternalLink className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-primary mt-3 font-medium">claude.com/pricing</p>
      </a>

      <p className="text-sm text-muted-foreground">
        Already have a Claude account? You're good — just continue.
      </p>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">I Have Claude — Continue</Button>
      </div>
    </div>
  )
}
