'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@clerk/nextjs'
import { AppShell } from '@/components/shell'
import { Button } from '@0ne/ui'
import { X, Copy, Check, Rocket, Lightbulb } from 'lucide-react'

const PROMPT_TEXT = `I'm building my first mini-app in 0ne Cloud (Next.js 16 App Router, Tailwind CSS, deployed on Vercel).

Before you build anything, ask me 3-5 quick questions about my business so you understand what would be most useful to me. Keep it conversational.

Then build me a simple but impressive tool based on my answers. Some ideas:
- A client ROI calculator
- A lead qualification scorecard
- A pricing calculator
- A project cost estimator
- A booking/availability checker

Requirements:
- Create it as a new page at /apps/my-first-app (create the directory under apps/web/src/app/)
- Keep the tech stack simple: just React + Tailwind (no external libraries)
- Use the existing design system: primary color #FF692D, background #F6F5F3, border-radius 6px
- Make it look polished and professional
- After building, commit and push so it auto-deploys to my live site

Start by asking me about my business!`

export default function GetStartedPage() {
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const [copied, setCopied] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [hiding, setHiding] = useState(false)

  const isDismissed = (user?.publicMetadata as { onboardingDismissed?: boolean })?.onboardingDismissed === true

  useEffect(() => {
    if (isLoaded && isDismissed) {
      router.replace('/')
    }
  }, [isLoaded, isDismissed, router])

  const handleCopy = () => {
    navigator.clipboard.writeText(PROMPT_TEXT)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleHide = async () => {
    setHiding(true)
    try {
      await fetch('/api/onboarding/dismiss', { method: 'POST' })
      setShowToast(true)
      setTimeout(() => {
        router.push('/')
      }, 2500)
    } catch {
      router.push('/')
    }
  }

  if (!isLoaded || isDismissed) {
    return null
  }

  return (
    <AppShell title="Get Started">
      <div className="mx-auto max-w-2xl py-8">
        {/* Hide button */}
        <div className="flex justify-end mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleHide}
            disabled={hiding}
            className="text-muted-foreground hover:text-foreground gap-1.5"
          >
            Hide Page
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Hero */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#FF692D]/10">
              <Rocket className="h-5 w-5 text-[#FF692D]" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome to 0ne Cloud</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            This is your personal AI command center.
            Build custom tools, dashboards, and automations — all powered by Claude Code.
          </p>
        </div>

        {/* Prompt Card */}
        <div className="rounded-lg border bg-card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">Build Your First Mini-App</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Copy this prompt into your Claude Code terminal to build your first app:
          </p>

          <div className="relative">
            <pre className="rounded-md bg-muted p-4 pr-12 text-sm leading-relaxed overflow-x-auto whitespace-pre-wrap break-words font-mono">
              {PROMPT_TEXT}
            </pre>
            <button
              onClick={handleCopy}
              className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center rounded-md bg-background border hover:bg-accent transition-colors"
              title={copied ? 'Copied!' : 'Copy to clipboard'}
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" />
              )}
            </button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            After Claude builds it, push to deploy:
          </p>
          <code className="mt-1 block rounded-md bg-muted px-3 py-2 text-sm font-mono">
            git add . && git commit -m &quot;My first app&quot; && git push
          </code>
        </div>

        {/* What can you build */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="h-5 w-5 text-[#FF692D]" />
            <h2 className="text-lg font-semibold">What can you build?</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF692D]" />
              Client dashboards
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF692D]" />
              ROI calculators
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF692D]" />
              Lead tracking tools
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF692D]" />
              Booking systems
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF692D]" />
              Custom CRMs
            </div>
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#FF692D]" />
              Anything you can describe
            </div>
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 rounded-lg border bg-background px-4 py-3 shadow-lg animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-[#FF692D]" />
            <p className="text-sm">
              Page hidden. Find it again in <strong>Settings</strong>.
            </p>
          </div>
        </div>
      )}
    </AppShell>
  )
}
