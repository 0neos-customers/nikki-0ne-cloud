'use client'

import { useState, useEffect } from 'react'
import { Button } from '@0ne/ui'
import { Download, Loader2, CheckCircle2 } from 'lucide-react'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function DownloadStep({ onNext, onBack, tokens }: StepProps) {
  const [installToken, setInstallToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // Generate install token on mount
  useEffect(() => {
    fetch('/api/onboarding/install-token', { method: 'POST' })
      .then(res => res.json())
      .then(data => setInstallToken(data.install_token))
      .catch(() => {})
  }, [])

  const handleDownload = async () => {
    if (!installToken) return
    setLoading(true)

    // Mark as downloaded
    fetch('/api/onboarding/mark-downloaded', { method: 'POST' }).catch(() => {})

    // Build token summary for the zip
    const tokenLines: string[] = []
    const tokenMap: Record<string, string> = {
      telegram_bot_token: 'TELEGRAM_BOT_TOKEN',
      slack_bot_token: 'SLACK_BOT_TOKEN',
      slack_app_token: 'SLACK_APP_TOKEN',
      slack_user_id: 'ALLOWED_SLACK_USER_ID',
      groq_api_key: 'GROQ_API_KEY',
      elevenlabs_api_key: 'ELEVENLABS_API_KEY',
      elevenlabs_voice_id: 'ELEVENLABS_VOICE_ID',
      gemini_api_key: 'GEMINI_API_KEY',
      perplexity_api_key: 'PERPLEXITY_API_KEY',
    }

    for (const [key, envKey] of Object.entries(tokenMap)) {
      if (tokens[key]) {
        tokenLines.push(`${envKey}=${tokens[key]}`)
      }
    }
    // Always include cloud token
    tokenLines.push(`ONE_CLOUD_TOKEN=${installToken}`)

    // For now, download tokens file — full zip integration comes later
    const blob = new Blob([tokenLines.join('\n') + '\n'], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = '0ne-tokens.txt'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)

    setDownloaded(true)
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Download 0ne</h2>
        <p className="text-muted-foreground mt-1">
          Your tokens are ready. Download the credentials file, then get the 0ne zip from your admin.
        </p>
      </div>

      {/* Token summary */}
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="font-semibold mb-3">Tokens collected:</h3>
        <div className="space-y-2">
          {Object.entries(tokens).filter(([, v]) => v).map(([key]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-muted-foreground">{key.replace(/_/g, ' ')}</span>
            </div>
          ))}
          {Object.entries(tokens).filter(([, v]) => v).length === 0 && (
            <p className="text-sm text-muted-foreground">No tokens collected yet — that's OK, you can add them later.</p>
          )}
          <div className="flex items-center gap-2 text-sm pt-2 border-t border-border">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="font-medium">Cloud connection token (auto-generated)</span>
          </div>
        </div>
      </div>

      <Button onClick={handleDownload} className="w-full" size="lg" disabled={loading || !installToken}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : downloaded ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {downloaded ? 'Downloaded — Download Again' : 'Download Credentials File'}
      </Button>

      <div className="rounded-lg bg-primary/5 border border-primary/15 p-4">
        <p className="text-sm">
          <strong>Next:</strong> Your admin will provide the 0ne zip file separately. Place the
          downloaded <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">0ne-tokens.txt</code> file
          inside the 0ne folder, then run the installer.
        </p>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          {downloaded ? 'Continue' : 'Skip Download'}
        </Button>
      </div>
    </div>
  )
}
