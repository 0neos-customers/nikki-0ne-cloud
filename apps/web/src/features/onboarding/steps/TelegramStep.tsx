'use client'

import { Button, Input } from '@0ne/ui'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function TelegramStep({ onNext, onBack, tokens, setToken }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Telegram Bot</h2>
        <p className="text-muted-foreground mt-1">
          Talk to your AI from your phone — text, voice notes, photos, anything. Takes about 60 seconds.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <Step n={1}>
          Download{' '}
          <a href="https://desktop.telegram.org" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">Telegram</a>
          {' '}if you don't have it
        </Step>
        <Step n={2}>
          Open Telegram and search for{' '}
          <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">@BotFather</a>
        </Step>
        <Step n={3}>Send the message <Code>/newbot</Code></Step>
        <Step n={4}>Pick a name (e.g., <Code>0ne</Code>)</Step>
        <Step n={5}>Pick a username ending in <Code>bot</Code> (e.g., <Code>yourname_one_bot</Code>)</Step>
        <Step n={6}>Copy the token BotFather gives you and paste it below</Step>
      </div>

      <div className="space-y-2">
        <label htmlFor="telegram_bot_token" className="text-sm font-medium leading-none">
          Telegram Bot Token
        </label>
        <Input
          id="telegram_bot_token"
          value={tokens.telegram_bot_token || ''}
          onChange={e => setToken('telegram_bot_token', e.target.value)}
          placeholder="7123456789:AAF-abc123..."
        />
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">
          {tokens.telegram_bot_token ? 'Continue' : 'Skip for Now'}
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
