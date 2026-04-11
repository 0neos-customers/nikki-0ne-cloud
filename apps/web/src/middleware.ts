import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import {
  canAccessApp,
  getInstanceSlug,
  hasInstanceMembership,
  readPermissions,
  type AppId,
  type UserPermissions,
} from '@0ne/auth/permissions'

type InstanceMetadata = {
  onboardingComplete?: boolean
  subscriptionStatus?: string
  role?: string
  permissions?: UserPermissions
  instances?: Record<string, UserPermissions>
}

// Marketing site paths served on the canonical root domain
const MARKETING_PATHS = ['/', '/install', '/diy-install', '/download', '/privacy', '/pricing', '/migrate', '/skills', '/preview']

// Derive the app's own hostname from NEXT_PUBLIC_APP_URL (set per-tenant by orchestrator)
const APP_HOST = process.env.NEXT_PUBLIC_APP_URL
  ? new URL(process.env.NEXT_PUBLIC_APP_URL).host
  : 'app.0neos.com'

function handleDomainRouting(request: NextRequest): NextResponse | null {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // This app's own domain — serve normally, no rewriting needed
  if (hostname === APP_HOST) {
    return null
  }

  // Control plane marketing domain routing (only on the control plane instance)
  if (APP_HOST === 'app.0neos.com') {
    if (hostname === '0neos.com' || hostname === 'www.0neos.com') {
      // API routes pass through (download API, etc.)
      if (pathname.startsWith('/api/')) {
        return NextResponse.next()
      }
      // Marketing paths get rewritten to /site/*
      if (MARKETING_PATHS.includes(pathname) || pathname.startsWith('/site')) {
        if (pathname.startsWith('/site')) {
          return NextResponse.next()
        }
        const url = request.nextUrl.clone()
        url.pathname = `/site${pathname === '/' ? '' : pathname}`
        return NextResponse.rewrite(url)
      }
      // Non-marketing paths on root domain → redirect to app subdomain
      const url = request.nextUrl.clone()
      url.host = 'app.0neos.com'
      return NextResponse.redirect(url, 307)
    }

    // ALL other domains on control plane → 301 permanent redirect to 0neos.com
    if (hostname !== 'localhost' && hostname !== 'localhost:3000') {
      const url = request.nextUrl.clone()
      url.host = '0neos.com'
      url.port = ''
      return NextResponse.redirect(url, 301)
    }
  }

  // Tenant instances: any hostname is fine (Vercel handles routing)
  return null
}

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/request-access',
  '/embed(.*)',
  '/privacy',
  '/security-policy',
  '/access-control',
  '/site(.*)', // Marketing site pages (no auth)
  '/api/public(.*)',
  '/api/cron(.*)',
  '/api/download(.*)', // Marketing site download API (token auth)
  '/api/external(.*)', // External API uses API key auth
  '/api/extension(.*)', // Chrome extension uses API key auth
  '/api/auth(.*)', // OAuth callbacks
  '/api/webhooks(.*)', // Webhooks from external services
  '/api/billing/webhooks', // Stripe billing webhooks (signature verified in handler)
  '/api/widget(.*)', // Widget API uses its own token auth
  '/api/admin/invites/validate', // Invite validation (pre-auth)
  '/api/migrate/validate', // Legacy install migration (pre-auth, token-verified)
  '/api/health', // Instance health check (public, no auth)
  '/api/supdate/check', // Version check (token auth, not Clerk)
  '/api/skills/registry', // Skill marketplace — public catalog browsing
  '/api/skills/marketplace.json', // Anthropic-compatible marketplace manifest
  '/api/skills/(.*)/download', // Skill download — uses its own Bearer auth
])

const appRoutes: Record<string, AppId> = {
  '/kpi': 'kpi',
  '/prospector': 'prospector',
  '/skool-sync': 'skoolSync',
  '/skool': 'skoolScheduler',
  '/media': 'ghlMedia',
}

export default clerkMiddleware(async (auth, request) => {
  // Handle domain routing (marketing site rewrites, redirects)
  const domainResponse = handleDomainRouting(request)
  if (domainResponse) return domainResponse

  const { pathname } = request.nextUrl

  if (isPublicRoute(request)) {
    return NextResponse.next()
  }

  const { userId, sessionClaims } = await auth.protect()

  const hostname = request.headers.get('host') || undefined
  const slug = getInstanceSlug(hostname)
  const metadata = sessionClaims?.metadata as InstanceMetadata | undefined

  // Instance membership gate: user must be a member of THIS instance.
  // Exempt: /unauthorized (the landing page for non-members), sign-out.
  const skipMembershipCheck =
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/sign-out') ||
    pathname.startsWith('/api/public')

  if (!skipMembershipCheck && !hasInstanceMembership(metadata, slug)) {
    return NextResponse.redirect(new URL('/unauthorized', request.url))
  }

  const instancePermissions = readPermissions(metadata, slug)
  const isInstanceAdmin = instancePermissions.isAdmin === true

  // Onboarding redirect: if user hasn't completed onboarding on this instance, send them there
  const skipOnboardingCheck =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/migrate-complete') ||
    pathname.startsWith('/sign-out')

  if (!skipOnboardingCheck) {
    // Admins without onboardingComplete are treated as complete (existing users)
    if (!metadata?.onboardingComplete && !isInstanceAdmin) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  // Subscription paywall: block access when subscription is not active.
  // Exempt: API routes, settings (so users can manage account), sign-out, the paywall page itself.
  const ACTIVE_STATUSES = ['active', 'trialing', 'comped']
  const skipSubscriptionCheck =
    pathname.startsWith('/api/') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/sign-out') ||
    pathname.startsWith('/unauthorized') ||
    pathname.startsWith('/subscription-required') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/migrate-complete')

  if (!skipSubscriptionCheck) {
    const hasPrivilegedRole = metadata?.role === 'admin' || metadata?.role === 'owner'
    const status = metadata?.subscriptionStatus
    if (status && !ACTIVE_STATUSES.includes(status) && !isInstanceAdmin && !hasPrivilegedRole) {
      return NextResponse.redirect(new URL('/subscription-required', request.url))
    }
  }

  for (const [route, appId] of Object.entries(appRoutes)) {
    if (pathname.startsWith(route)) {
      const hasAccess = await canAccessApp(userId, appId, slug)
      if (!hasAccess) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
