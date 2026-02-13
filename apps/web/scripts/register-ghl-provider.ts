/**
 * Register Skool Conversation Provider with GHL
 *
 * This is a ONE-TIME setup script that registers your app as a custom
 * conversation channel ("Skool") in the GHL unified inbox.
 *
 * Prerequisites:
 * 1. GHL Marketplace app created with required scopes
 * 2. App installed to your GHL location
 * 3. Environment variables configured (see .env.example)
 *
 * Usage:
 *   bun run apps/web/scripts/register-ghl-provider.ts
 *
 * After running:
 *   - Copy the providerId to your .env.local
 *   - Redeploy your app (Vercel will pick up the new env var)
 *
 * @module scripts/register-ghl-provider
 */

import * as fs from 'fs'
import { registerConversationProvider } from '../src/features/dm-sync/lib/ghl-conversation'

// =============================================================================
// LOAD ENVIRONMENT
// =============================================================================

function loadEnv(): Record<string, string> {
  const envPaths = [
    new URL('../.env.local', import.meta.url),
    new URL('../.env', import.meta.url),
  ]

  let envPath: URL | null = null
  for (const path of envPaths) {
    try {
      if (fs.existsSync(path)) {
        envPath = path
        break
      }
    } catch {
      // Continue to next path
    }
  }

  if (!envPath) {
    console.error('Error: No .env.local or .env file found')
    console.error('Create one with the required variables (see .env.example)')
    process.exit(1)
  }

  const envContent = fs.readFileSync(envPath, 'utf-8')
  const env: Record<string, string> = {}

  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) return

    const equalsIndex = trimmed.indexOf('=')
    if (equalsIndex === -1) return

    const key = trimmed.substring(0, equalsIndex).trim()
    const value = trimmed.substring(equalsIndex + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = value
  })

  return env
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('='.repeat(60))
  console.log('GHL Conversation Provider Registration')
  console.log('='.repeat(60))
  console.log()

  // Load environment
  const env = loadEnv()

  // Validate required environment variables
  const clientId = env.GHL_MARKETPLACE_CLIENT_ID
  const clientSecret = env.GHL_MARKETPLACE_CLIENT_SECRET
  const refreshToken = env.GHL_MARKETPLACE_REFRESH_TOKEN
  const locationId = env.GHL_LOCATION_ID
  const appUrl = env.NEXT_PUBLIC_APP_URL

  const missing: string[] = []
  if (!clientId) missing.push('GHL_MARKETPLACE_CLIENT_ID')
  if (!clientSecret) missing.push('GHL_MARKETPLACE_CLIENT_SECRET')
  if (!refreshToken) missing.push('GHL_MARKETPLACE_REFRESH_TOKEN')
  if (!locationId) missing.push('GHL_LOCATION_ID')
  if (!appUrl) missing.push('NEXT_PUBLIC_APP_URL')

  if (missing.length > 0) {
    console.error('Missing required environment variables:')
    missing.forEach((v) => console.error(`  - ${v}`))
    console.error()
    if (missing.includes('GHL_MARKETPLACE_REFRESH_TOKEN')) {
      console.error('To get your refresh token:')
      console.error('1. Deploy your app to Vercel first')
      console.error('2. Visit: ' + (appUrl || 'https://your-app.vercel.app') + '/api/auth/ghl/callback')
      console.error('3. Click "Authorize with GHL" and follow the OAuth flow')
      console.error('4. Copy the refresh token to your .env.local and Vercel env')
      console.error()
    }
    console.error('Please add these to your .env.local file.')
    process.exit(1)
  }

  // Check if provider already registered
  if (env.GHL_CONVERSATION_PROVIDER_ID) {
    console.log('Warning: GHL_CONVERSATION_PROVIDER_ID is already set in your environment.')
    console.log(`  Current value: ${env.GHL_CONVERSATION_PROVIDER_ID}`)
    console.log()
    console.log('If you want to re-register, remove this variable first.')
    console.log('Re-registration may create duplicate providers in GHL.')
    process.exit(0)
  }

  console.log('Configuration:')
  console.log(`  Location ID: ${locationId}`)
  console.log(`  App URL: ${appUrl}`)
  console.log(`  Outbound webhook: ${appUrl}/api/webhooks/ghl/outbound-message`)
  console.log()

  // Register the provider
  console.log('Registering "Skool" conversation provider with GHL...')
  console.log()

  try {
    const result = await registerConversationProvider(
      { clientId: clientId!, clientSecret: clientSecret!, refreshToken: refreshToken! },
      locationId!,
      appUrl!
    )

    console.log()
    console.log('='.repeat(60))
    console.log('SUCCESS! Skool provider registered.')
    console.log('='.repeat(60))
    console.log()
    console.log('Provider details:')
    console.log(`  Provider ID: ${result.providerId}`)
    console.log(`  Name: ${result.name}`)
    if (result.description) {
      console.log(`  Description: ${result.description}`)
    }
    console.log()
    console.log('NEXT STEPS:')
    console.log('1. Add this line to your .env.local:')
    console.log()
    console.log(`   GHL_CONVERSATION_PROVIDER_ID=${result.providerId}`)
    console.log()
    console.log('2. Add the same variable to your Vercel environment:')
    console.log('   https://vercel.com/your-team/0ne-app/settings/environment-variables')
    console.log()
    console.log('3. Redeploy your app for the changes to take effect.')
    console.log()

  } catch (error) {
    console.error()
    console.error('Registration failed:')
    console.error(error instanceof Error ? error.message : error)
    console.error()
    console.error('Troubleshooting:')
    console.error('1. Verify your GHL Marketplace app credentials are correct')
    console.error('2. Ensure the app is installed to the specified location')
    console.error('3. Check that the app has "conversations" OAuth scope')
    console.error('4. Try re-installing the app to your GHL location')
    process.exit(1)
  }
}

main().catch((error) => {
  console.error('Unexpected error:', error)
  process.exit(1)
})
