'use client'

import { Button, Input } from '@0ne/ui'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function VoiceStep({ onNext, onBack, tokens, setToken }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">Voice Features</h2>
        <p className="text-muted-foreground mt-1">
          Send voice messages to your AI and hear it talk back. Both are optional.
        </p>
      </div>

      <div className="space-y-8">
        {/* Groq */}
        <div>
          <h3 className="font-semibold mb-1">Groq — Voice Transcription (Free)</h3>
          <p className="text-sm text-muted-foreground mb-4">Your AI can understand voice notes you send it.</p>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Step n={1}>Go to <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">console.groq.com</a> and create a free account</Step>
            <Step n={2}>Click <strong>API Keys</strong>, create a new key, copy it</Step>
          </div>
          <div className="mt-3 space-y-2">
            <label htmlFor="groq_api_key" className="text-sm font-medium leading-none">
              Groq API Key
            </label>
            <Input id="groq_api_key" value={tokens.groq_api_key || ''} onChange={e => setToken('groq_api_key', e.target.value)} placeholder="gsk_..." />
          </div>
        </div>

        {/* ElevenLabs */}
        <div>
          <h3 className="font-semibold mb-1">ElevenLabs — Voice Responses (Free to start)</h3>
          <p className="text-sm text-muted-foreground mb-4">Your AI responds with a realistic voice. Free plan gives ~10 minutes/month.</p>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Step n={1}>Go to <a href="https://elevenlabs.io" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">elevenlabs.io</a> and create an account</Step>
            <Step n={2}>Click your profile icon, then <strong>Profile + API key</strong>, copy</Step>
          </div>
          <div className="mt-3 space-y-3">
            <div className="space-y-2">
              <label htmlFor="elevenlabs_api_key" className="text-sm font-medium leading-none">
                ElevenLabs API Key
              </label>
              <Input id="elevenlabs_api_key" value={tokens.elevenlabs_api_key || ''} onChange={e => setToken('elevenlabs_api_key', e.target.value)} placeholder="sk_..." />
            </div>
            <div className="space-y-2">
              <label htmlFor="elevenlabs_voice_id" className="text-sm font-medium leading-none">
                Voice ID (optional)
              </label>
              <Input id="elevenlabs_voice_id" value={tokens.elevenlabs_voice_id || ''} onChange={e => setToken('elevenlabs_voice_id', e.target.value)} placeholder="Voice ID" />
            </div>
          </div>
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
