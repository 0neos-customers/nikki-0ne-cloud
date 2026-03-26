/**
 * AI Services Step (REMOVED FROM MAIN ONBOARDING)
 *
 * This step is no longer part of the main onboarding wizard.
 * API keys for these services are now configured per-skill:
 * - Gemini → ImageGen skill (GEMINI_API_KEY)
 * - Perplexity → Research skill (PERPLEXITY_API_KEY)
 *
 * This file is preserved as reference for the key setup UX.
 * See Settings > Onboarding for the full list of feature API keys.
 */

'use client'

import { Button, Input } from '@0ne/ui'
import type { StepProps } from '@/app/(onboarding)/onboarding/page'

export function AiServicesStep({ onNext, onBack, tokens, setToken }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-heading font-bold">AI Services</h2>
        <p className="text-muted-foreground mt-1">
          Power advanced features like video analysis, image generation, and deep research. Both have generous free tiers.
        </p>
      </div>

      <div className="space-y-8">
        {/* Gemini */}
        <div>
          <h3 className="font-semibold mb-1">Google Gemini — Multimodal AI (Free)</h3>
          <p className="text-sm text-muted-foreground mb-4">Video understanding, image generation, and document analysis.</p>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Step n={1}>Go to <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">aistudio.google.com/apikey</a></Step>
            <Step n={2}>Click <strong>Create API key</strong>, select any project, copy</Step>
          </div>
          <div className="mt-3 space-y-2">
            <label htmlFor="gemini_api_key" className="text-sm font-medium leading-none">
              Gemini API Key
            </label>
            <Input id="gemini_api_key" value={tokens.gemini_api_key || ''} onChange={e => setToken('gemini_api_key', e.target.value)} placeholder="AIzaSy..." />
          </div>
        </div>

        {/* Perplexity */}
        <div>
          <h3 className="font-semibold mb-1">Perplexity — AI Research (Free to start)</h3>
          <p className="text-sm text-muted-foreground mb-4">Deep research and web-grounded answers.</p>
          <div className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Step n={1}>Go to <a href="https://www.perplexity.ai/settings/api" target="_blank" rel="noopener noreferrer" className="text-primary font-medium hover:underline">perplexity.ai/settings/api</a></Step>
            <Step n={2}>Click <strong>Generate</strong> under API Keys, copy</Step>
          </div>
          <div className="mt-3 space-y-2">
            <label htmlFor="perplexity_api_key" className="text-sm font-medium leading-none">
              Perplexity API Key
            </label>
            <Input id="perplexity_api_key" value={tokens.perplexity_api_key || ''} onChange={e => setToken('perplexity_api_key', e.target.value)} placeholder="pplx-..." />
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
