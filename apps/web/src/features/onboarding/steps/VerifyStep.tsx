'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@0ne/ui'
import { Loader2, CheckCircle2, Wifi } from 'lucide-react'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function VerifyStep({ onNext, onBack }: StepProps) {
  const [connected, setConnected] = useState(false)
  const [verified, setVerified] = useState(false)
  const [platform, setPlatform] = useState<string | null>(null)
  const [polling, setPolling] = useState(true)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch('/api/onboarding/status')
        const data = await res.json()
        if (data.isConnected) {
          setConnected(true)
          setPlatform(data.platform)
          if (data.isVerified) setVerified(true)
          setPolling(false)
        }
      } catch { /* silent */ }
    }

    poll() // Check immediately
    intervalRef.current = setInterval(poll, 5000)

    // Stop polling after 10 minutes
    const timeout = setTimeout(() => {
      setPolling(false)
      if (intervalRef.current) clearInterval(intervalRef.current)
    }, 600000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    if (connected && intervalRef.current) {
      clearInterval(intervalRef.current)
    }
  }, [connected])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Verify Installation</h2>
        <p className="text-muted-foreground mt-1">
          Run the installer on your computer and we'll detect it automatically.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 text-center space-y-4">
        {connected ? (
          <>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold text-green-700">
                {verified ? 'Installation Verified!' : 'Installation Detected!'}
              </p>
              {platform && (
                <p className="text-sm text-muted-foreground mt-1">
                  Connected from {platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform}
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                {polling ? (
                  <Loader2 className="h-8 w-8 text-primary animate-spin" />
                ) : (
                  <Wifi className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            </div>
            <div>
              <p className="text-lg font-semibold">
                {polling ? 'Waiting for your install...' : 'Polling stopped'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Run the installer on your computer. We'll detect it automatically.
              </p>
            </div>
          </>
        )}
      </div>

      {!connected && (
        <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
          <p className="font-medium">How to install:</p>
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Unzip the 0ne folder you received</li>
            <li>Make sure <code className="px-1 py-0.5 rounded bg-card text-xs font-mono">0ne-tokens.txt</code> is inside</li>
            <li>Double-click <strong>Install on Mac.command</strong> (or <strong>Install on Windows.bat</strong>)</li>
            <li>Follow the prompts — the installer handles everything</li>
          </ol>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          {connected ? 'Continue' : 'Skip — I\'ll Install Later'}
        </Button>
      </div>
    </div>
  )
}
