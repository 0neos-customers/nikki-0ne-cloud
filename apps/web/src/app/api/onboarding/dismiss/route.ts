import { NextResponse } from 'next/server'
import { auth, clerkClient } from '@clerk/nextjs/server'
import { safeErrorResponse } from '@/lib/security'

/**
 * POST /api/onboarding/dismiss
 * Sets onboardingDismissed: true in the user's Clerk publicMetadata.
 * Hides the "Get Started" page from the sidebar and redirects away from it.
 */
export async function POST() {
  try {
    const { userId } = await auth.protect()
    const client = await clerkClient()
    const user = await client.users.getUser(userId)

    await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingDismissed: true,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return safeErrorResponse('Failed to dismiss onboarding', error)
  }
}

/**
 * DELETE /api/onboarding/dismiss
 * Re-enables onboarding by setting onboardingDismissed: false.
 * Used from Settings to bring back the "Get Started" page.
 */
export async function DELETE() {
  try {
    const { userId } = await auth.protect()
    const client = await clerkClient()
    const user = await client.users.getUser(userId)

    await client.users.updateUser(userId, {
      publicMetadata: {
        ...user.publicMetadata,
        onboardingDismissed: false,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return safeErrorResponse('Failed to re-enable onboarding', error)
  }
}
