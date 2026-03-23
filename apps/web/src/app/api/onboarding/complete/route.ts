import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'

export async function POST() {
  const { userId } = await auth.protect()

  const client = await clerkClient()
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { onboardingComplete: true },
  })

  return NextResponse.json({ success: true })
}
