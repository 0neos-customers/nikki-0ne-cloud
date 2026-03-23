'use client'

import { useState } from 'react'
import { Button } from '@0ne/ui'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function SystemCheckStep({ onNext, onBack }: StepProps) {
  const [os, setOS] = useState<'mac' | 'windows'>('mac')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">System Check</h2>
        <p className="text-muted-foreground mt-1">
          Make sure your computer meets the requirements.
        </p>
      </div>

      {/* OS Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-xl bg-muted p-1">
          <button
            onClick={() => setOS('mac')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              os === 'mac' ? 'bg-primary text-white shadow-sm' : 'text-foreground hover:text-primary'
            }`}
          >
            Mac
          </button>
          <button
            onClick={() => setOS('windows')}
            className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all ${
              os === 'windows' ? 'bg-primary text-white shadow-sm' : 'text-foreground hover:text-primary'
            }`}
          >
            Windows
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {os === 'mac' ? (
          <>
            <Requirement n={1} title="macOS 13.0 (Ventura) or later" detail="Check: Apple menu > About This Mac" />
            <Requirement n={2} title="Xcode Command Line Tools" detail="Open Terminal and run: xcode-select --install" />
            <Requirement n={3} title="Homebrew" detail='In Terminal, run: /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"' />
          </>
        ) : (
          <>
            <Requirement n={1} title="Windows 10 (1809+) or Windows 11" detail="Check: Settings > System > About" />
            <Requirement n={2} title="Git for Windows" detail="Download from git-scm.com/downloads/win — use all defaults" />
            <Requirement n={3} title="winget (Windows Package Manager)" detail='Search "App Installer" in the Microsoft Store' />
          </>
        )}
      </div>

      <div className="rounded-lg bg-primary/5 border border-primary/15 p-4">
        <p className="text-sm">
          <strong>The installer handles everything else</strong> — Node.js, Claude Code, Obsidian, and more are installed automatically.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">Continue</Button>
      </div>
    </div>
  )
}

function Requirement({ n, title, detail }: { n: number; title: string; detail: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-white text-xs font-bold">
        {n}
      </span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}
