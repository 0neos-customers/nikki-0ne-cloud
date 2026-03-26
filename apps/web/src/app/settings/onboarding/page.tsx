'use client'

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { AppShell } from '@/components/shell'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, Button } from '@0ne/ui'
import { Rocket, Eye, EyeOff, Key } from 'lucide-react'

export default function OnboardingSettingsPage() {
  const { user } = useUser()
  const isDismissed = (user?.publicMetadata as { onboardingDismissed?: boolean })?.onboardingDismissed === true
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(isDismissed)

  const toggleOnboarding = async () => {
    setLoading(true)
    try {
      await fetch('/api/onboarding/dismiss', { method: status ? 'DELETE' : 'POST' })
      setStatus(!status)
      // Clerk metadata takes a moment to propagate — update local state immediately
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppShell title="0ne">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Onboarding</h1>
          <p className="text-muted-foreground">Manage your setup experience</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rocket className="h-5 w-5" />
              Get Started Page
            </CardTitle>
            <CardDescription>
              The Get Started page helps you build your first app with Claude Code.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${status ? 'bg-gray-400' : 'bg-lime-500'}`} />
                <span className="text-sm">{status ? 'Hidden' : 'Visible'}</span>
              </div>
              <Button variant="outline" size="sm" onClick={toggleOnboarding} disabled={loading}>
                {status ? <Eye className="h-4 w-4 mr-2" /> : <EyeOff className="h-4 w-4 mr-2" />}
                {status ? 'Show Get Started Page' : 'Hide'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Feature API Keys
            </CardTitle>
            <CardDescription>
              Some features need API keys. They are prompted when you first use each feature.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {[
                { feature: 'Image Generation', key: 'Gemini API key', env: 'GEMINI_API_KEY' },
                { feature: 'Research', key: 'Perplexity API key', env: 'PERPLEXITY_API_KEY' },
                { feature: 'Social Scraping', key: 'Apify API token', env: 'APIFY_TOKEN' },
                { feature: 'Slack Integration', key: 'Slack Bot Token', env: 'SLACK_BOT_TOKEN' },
                { feature: 'Premium Voice', key: 'ElevenLabs API key', env: 'ELEVENLABS_API_KEY' },
              ].map(({ feature, key, env }) => (
                <div key={env} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="font-medium">{feature}</span>
                    <span className="text-muted-foreground ml-2">&rarr; {key}</span>
                  </div>
                  <code className="text-xs bg-muted px-2 py-0.5 rounded">{env}</code>
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Set these in your <code className="bg-muted px-1 rounded">.env.local</code> file or Vercel environment variables.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
