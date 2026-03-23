'use client'

import { Button } from '@0ne/ui'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function WelcomeStep({ onNext }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-heading font-bold">Welcome to 0ne</h1>
        <p className="text-muted-foreground mt-2 text-lg">
          Let's get your Personal AI Infrastructure set up. This takes about 15 minutes —
          you'll create a few free accounts and collect some tokens.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <h3 className="font-semibold">What you'll do:</h3>
        <ul className="space-y-3">
          {[
            'Check your system requirements',
            'Set up your Claude AI subscription',
            'Connect messaging (Telegram and/or Slack)',
            'Add optional AI services (voice, research, images)',
            'Download and install 0ne on your computer',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/15 p-4">
        <p className="text-sm">
          <strong>Don't worry if this looks technical.</strong> Each step walks you through
          everything. Skip anything you're not sure about — you can always come back.
        </p>
      </div>

      <Button onClick={onNext} className="w-full" size="lg">
        Let's Get Started
      </Button>
    </div>
  )
}
