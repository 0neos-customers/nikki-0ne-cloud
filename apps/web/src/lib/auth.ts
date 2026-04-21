/**
 * Better Auth server config.
 *
 * Replaces Clerk for the customer-side of 0ne Cloud. Each customer fork runs
 * its own instance of this config against its own Neon DB and its own
 * BETTER_AUTH_SECRET — physical tenant isolation.
 *
 * Day-1 features (per PRD Decisions Locked):
 *   - email + password (with bcryptjs override for transparent Clerk import)
 *   - Google OAuth (catch-all redirect via control plane)
 *   - TOTP MFA via twoFactor plugin
 *   - Organizations (single org per instance)
 *
 * Email transport: Mailgun via lib/email.ts (provider-agnostic — swap by
 * changing one file).
 */

import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { organization, twoFactor } from 'better-auth/plugins'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { db, eq, and } from '@0ne/db/server'
import { member, organization as organizationTable } from '@0ne/db/server'
import { sendEmail } from './email'

const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const oauthRedirectBase = process.env.OAUTH_REDIRECT_BASE_URL || baseURL

export const auth = betterAuth({
  appName: '0ne Cloud',
  baseURL,
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
  }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: false,
    // Transparent Clerk hash import: Clerk stores bcrypt by default, so we
    // override Better Auth's default scrypt with bcryptjs. Existing users
    // sign in with their original passwords. New users get re-bcrypted
    // (compatible with re-imports).
    password: {
      hash: async (password: string) => bcrypt.hash(password, 10),
      verify: async ({ hash, password }: { hash: string; password: string }) =>
        bcrypt.compare(password, hash),
    },
    sendResetPassword: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Reset your 0ne Cloud password',
        text: `Hi ${user.name || ''},\n\nReset your password: ${url}\n\nIf you didn't request this, you can ignore this email.`,
        html: `<p>Hi ${user.name || ''},</p><p><a href="${url}">Click here to reset your password</a>.</p><p>If you didn't request this, you can ignore this email.</p>`,
      })
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: 'Verify your 0ne Cloud email',
        text: `Hi ${user.name || ''},\n\nVerify your email: ${url}`,
        html: `<p>Hi ${user.name || ''},</p><p><a href="${url}">Click here to verify your email</a>.</p>`,
      })
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
      // PRD Phase B: shared Google OAuth client uses one redirect URI on the
      // control plane (app.0neos.com). The control plane validates state and
      // 302s back to the originating customer subdomain. Each customer
      // instance still completes the code exchange itself.
      redirectURI: `${oauthRedirectBase}/api/oauth/google/callback`,
    },
  },

  plugins: [
    organization({
      // Only the orchestrator creates the single org per instance. Customers
      // join via invite, not by creating new orgs in their own instance.
      allowUserToCreateOrganization: false,
      async sendInvitationEmail(data) {
        const inviteLink = `${baseURL}/accept-invite?token=${data.id}`
        await sendEmail({
          to: data.email,
          subject: `You're invited to ${data.organization.name} on 0ne Cloud`,
          text: `${data.inviter.user.name || 'Someone'} invited you to join ${data.organization.name}.\n\nAccept: ${inviteLink}`,
          html: `<p>${data.inviter.user.name || 'Someone'} invited you to join <strong>${data.organization.name}</strong>.</p><p><a href="${inviteLink}">Accept the invitation</a></p>`,
        })
      },
    }),
    twoFactor({
      issuer: '0ne Cloud',
      allowPasswordless: true,
    }),
  ],

  // Auto-promote the instance owner and platform admin to admin member on
  // first sign-in. The orchestrator seeds the organization row + platform
  // admin credential up front, but the owner's user row doesn't exist until
  // they actually sign in (via Google OAuth or email/password). This hook
  // closes that gap so they land inside the app as admin.
  databaseHooks: {
    user: {
      create: {
        after: async (user: { id: string; email: string }) => {
          const ownerEmail = process.env.NEXT_PUBLIC_INSTANCE_OWNER_EMAIL?.toLowerCase()
          const platformAdmin = process.env.NEXT_PUBLIC_PLATFORM_ADMIN_EMAIL?.toLowerCase()
          const email = user.email.toLowerCase()
          if (email !== ownerEmail && email !== platformAdmin) return

          const [org] = await db.select().from(organizationTable).limit(1)
          if (!org) return

          const existing = await db
            .select()
            .from(member)
            .where(and(eq(member.organizationId, org.id), eq(member.userId, user.id)))
            .limit(1)
          if (existing.length > 0) return

          await db.insert(member).values({
            id: randomUUID(),
            organizationId: org.id,
            userId: user.id,
            role: 'admin',
            createdAt: new Date(),
          })
        },
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },

  rateLimit: {
    enabled: true,
    window: 60,
    max: 60,
  },
})

export type Auth = typeof auth
