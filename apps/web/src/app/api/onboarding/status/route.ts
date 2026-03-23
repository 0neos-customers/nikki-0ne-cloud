import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createServerClient } from '@0ne/db/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth.protect()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('user_installs')
    .select('install_token, status, platform, one_version, downloaded_at, connected_at, verified_at')
    .eq('clerk_user_id', userId)
    .single()

  if (!data) {
    return NextResponse.json({
      hasInstallToken: false,
      hasDownloaded: false,
      isConnected: false,
      isVerified: false,
      installToken: null,
      platform: null,
    })
  }

  return NextResponse.json({
    hasInstallToken: true,
    hasDownloaded: data.status !== 'pending',
    isConnected: data.status === 'connected' || data.status === 'verified',
    isVerified: data.status === 'verified',
    installToken: data.install_token,
    platform: data.platform,
    oneVersion: data.one_version,
  })
}
