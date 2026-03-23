'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@0ne/ui'
import { CheckCircle2, Loader2, PartyPopper } from 'lucide-react'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function CompleteStep({ onBack }: StepProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleComplete = async () => {
    setLoading(true)
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' })
      router.push('/')
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 text-center">
      <div className="flex justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <PartyPopper className="h-10 w-10 text-primary" />
        </div>
      </div>

      <div>
        <h2 className="text-3xl font-heading font-bold">You're All Set!</h2>
        <p className="text-muted-foreground mt-2 text-lg max-w-md mx-auto">
          Your 0ne system is ready. Welcome aboard.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 text-left space-y-3">
        <h3 className="font-semibold">What's next:</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Your admin will enable apps for your dashboard</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Open 0ne on your computer to start your first session</span>
          </li>
          <li className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Follow the onboarding lessons in Obsidian</span>
          </li>
        </ul>
      </div>

      <Button onClick={handleComplete} className="w-full" size="lg" disabled={loading}>
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Go to Dashboard
      </Button>

      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        Back to previous step
      </button>
    </div>
  )
}
