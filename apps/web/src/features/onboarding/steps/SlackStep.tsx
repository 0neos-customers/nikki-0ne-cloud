/**
 * Slack Step (REMOVED FROM MAIN ONBOARDING)
 *
 * Slack integration is now optional and configured separately.
 * Set SLACK_BOT_TOKEN in .env.local or Vercel env vars.
 *
 * This file is preserved as reference for the setup UX.
 */

'use client'

import { useState } from 'react'
import { Button, Input } from '@0ne/ui'
import { Copy, Check } from 'lucide-react'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

const SLACK_MANIFEST = `{
  "display_information": {
    "name": "0ne",
    "description": "Personal AI Infrastructure",
    "background_color": "#FF692D"
  },
  "features": {
    "bot_user": {
      "display_name": "one",
      "always_online": true
    }
  },
  "oauth_config": {
    "scopes": {
      "bot": [
        "chat:write", "chat:write.customize", "im:history",
        "im:read", "im:write", "app_mentions:read",
        "users:read", "files:read", "files:write"
      ]
    }
  },
  "settings": {
    "event_subscriptions": { "bot_events": ["message.im", "app_mention"] },
    "interactivity": { "is_enabled": false },
    "org_deploy_enabled": false,
    "socket_mode_enabled": true,
    "token_rotation_enabled": false
  }
}`

export function SlackStep({ onNext, onBack, tokens, setToken }: StepProps) {
  const [copied, setCopied] = useState(false)

  const copyManifest = () => {
    navigator.clipboard.writeText(SLACK_MANIFEST)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Slack App</h2>
        <p className="text-muted-foreground mt-1">
          Put your AI right inside your Slack workspace. Don't use Slack? Skip this.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Step n={1}>
          Go to{' '}
          <a href="https://api.slack.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">api.slack.com/apps</a>
        </Step>
        <Step n={2}>Click <strong>Create New App</strong> then <strong>From an app manifest</strong></Step>
        <Step n={3}>Pick your workspace</Step>
        <Step n={4}>Paste this manifest:</Step>
      </div>

      {/* Manifest block */}
      <div className="rounded-xl overflow-hidden border border-border">
        <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
          <span className="text-xs font-mono text-muted-foreground">slack-app-manifest.json</span>
          <button onClick={copyManifest} className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-card border border-border hover:bg-muted transition-colors">
            {copied ? <><Check className="h-3.5 w-3.5" /> Copied</> : <><Copy className="h-3.5 w-3.5" /> Copy</>}
          </button>
        </div>
        <pre className="p-4 text-xs font-mono bg-card overflow-x-auto max-h-48 overflow-y-auto">{SLACK_MANIFEST}</pre>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Step n={5}>Click <strong>Next</strong>, review, then <strong>Create</strong></Step>
        <Step n={6}>Scroll to <strong>App-Level Tokens</strong>, generate with scope <Code>connections:write</Code>, copy the <Code>xapp-</Code> token</Step>
        <Step n={7}>Go to <strong>OAuth & Permissions</strong>, click <strong>Install to Workspace</strong>, copy the <Code>xoxb-</Code> token</Step>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <label htmlFor="slack_bot_token" className="text-sm font-medium leading-none">
            Slack Bot Token
          </label>
          <Input id="slack_bot_token" value={tokens.slack_bot_token || ''} onChange={e => setToken('slack_bot_token', e.target.value)} placeholder="xoxb-..." />
        </div>
        <div className="space-y-2">
          <label htmlFor="slack_app_token" className="text-sm font-medium leading-none">
            Slack App Token
          </label>
          <Input id="slack_app_token" value={tokens.slack_app_token || ''} onChange={e => setToken('slack_app_token', e.target.value)} placeholder="xapp-..." />
        </div>
        <div className="space-y-2">
          <label htmlFor="slack_user_id" className="text-sm font-medium leading-none">
            Slack User ID
          </label>
          <Input id="slack_user_id" value={tokens.slack_user_id || ''} onChange={e => setToken('slack_user_id', e.target.value)} placeholder="U0123ABC456" />
          <p className="text-xs text-muted-foreground">Profile, three dots, Copy member ID</p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          {tokens.slack_bot_token ? 'Continue' : 'Skip for Now'}
        </Button>
      </div>
    </div>
  )
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-muted text-xs font-semibold">{n}</span>
      <div className="leading-relaxed">{children}</div>
    </div>
  )
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono">{children}</code>
}
