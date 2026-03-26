'use client'

import { Button, Input } from '@0ne/ui'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function VoiceStep({ onNext, onBack, tokens, setToken }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Voice &amp; Audio</h2>
        <p className="text-muted-foreground mt-1">
          Set up speech-to-text for voice commands and text-to-speech for spoken responses.
        </p>
      </div>

      <div className="space-y-8">
        {/* Groq STT */}
        <div>
          <h3 className="font-semibold mb-1">Groq — Lightning-fast speech-to-text (Free)</h3>
          <p className="text-sm text-muted-foreground mb-4">Send voice messages and your AI understands them instantly.</p>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Step n={1}>Go to <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">console.groq.com/keys</a> and create a free account</Step>
            <Step n={2}>Create a new API key and copy it</Step>
          </div>
          <div className="mt-3 space-y-2">
            <label htmlFor="groq_api_key" className="text-sm font-medium leading-none">
              Groq API Key
            </label>
            <Input id="groq_api_key" value={tokens.groq_api_key || ''} onChange={e => setToken('groq_api_key', e.target.value)} placeholder="gsk_..." />
          </div>
        </div>

        {/* Built-in TTS */}
        <div>
          <h3 className="font-semibold mb-1">Text-to-Speech — Built-in by default</h3>
          <p className="text-sm text-muted-foreground mb-2">
            0ne uses your system&apos;s built-in text-to-speech by default. No API key needed.
          </p>
          <p className="text-xs text-muted-foreground/70">
            Want premium voices? You can upgrade to ElevenLabs later via the 0neVoice skill.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button onClick={onNext} className="flex-1">Continue</Button>
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
