# Skool-GHL DM Sync - Cloud-Only Integration

> **Private App Build Plan** - 100% server-side using existing SKOOL_COOKIES.
> No Chrome Extension needed. Runs 24/7 autonomously.

---

## Overview

**Goal:** Skool DMs appear in GHL unified inbox. Reply from GHL → auto-sends via Skool API.

**Architecture:**
```
Vercel Cron → Skool API (SKOOL_COOKIES) → Supabase → GHL Conversation Provider API
```

**Key Insight:** You already have a GitHub Action that generates SKOOL_COOKIES and passes them to 0ne-app. Everything can run server-side with no browser/extension required.

---

## ⚠️ CRITICAL: GHL Marketplace App Required

**Conversation Provider is a Marketplace feature only.** Private Integration won't work.

**Jimmy Actions:**
- [x] Create marketplace app at [marketplace.gohighlevel.com](https://marketplace.gohighlevel.com) ✅
- [x] Request OAuth scopes ✅
- [x] Install app to GHL location ✅
- [x] Add credentials to .env.local + Vercel ✅

**Credentials (saved 2026-02-12):**
```bash
GHL_MARKETPLACE_CLIENT_ID=698ea3fb71e7c61bc9765652-mlkdtq5o
GHL_MARKETPLACE_CLIENT_SECRET=34236e20-a8bb-4559-bab3-d5a8c4db994e
GHL_MARKETPLACE_WEBHOOK_SECRET=857f960d4605bd2264b5a974f95800d697dc65dc9797f5a998d00e05d2c585a9
```

**Custom Provider Alias:** "Skool" (this is how the channel will appear in GHL inbox)

---

## ⚠️ CRITICAL: Contact Matching Strategy (NO DUPLICATES)

**Every Skool member already has a GHL contact** (via Zapier automation on join).

**Contact Lookup Priority:**
1. **Check `dm_contact_mappings` cache** - Fastest, already mapped
2. **Search GHL by email** - Use `extractMemberEmail()` from existing `member-sync.ts`
3. **Search GHL by `skool_user_id` custom field** - If already set from previous sync
4. **Create NEW contact with REAL data** - Only if truly not found (~1% of cases)

**When creating new contact (rare):**
- Use REAL email from survey (NOT synthetic `@skool.internal`)
- Use REAL phone from survey if available
- Parse phone from survey answers (same pattern as email)
- Tag with `skool_unmatched` for manual review

**Existing infrastructure to reuse:**
- `features/skool/lib/member-sync.ts` → `extractMemberEmail()`, `matchMembersViaGhlApi()`
- `features/kpi/lib/ghl-client.ts` → `searchContactByEmail()`, `updateContactTags()`

**After matching, always update contact with:**
- `skool_user_id` custom field
- `skool_username` custom field (for display in GHL)

**🎯 GOAL: 100% match rate.** Current rate is 97.5%. Every Skool member should have a GHL contact.

---

## Phase Structure (For Agent Deployment)

This plan is structured for **multi-agent sequential deployment**:
- Each phase = 1 agent with fresh context
- Each phase ends with: code complete, tests pass, commit (NO push)
- BUILD-STATE.md updated between phases
- Main session orchestrates, agents execute

**Before deploying:** Ask Jimmy "Deploy all phases now, or pause between each?"

---

## Phase 1: Database Schema + Feature Module Skeleton

**Goal:** Tables exist, feature module scaffolded, types defined.

### Deliverables
- [ ] Create migration `packages/db/schemas/027-dm-sync.sql`
- [ ] Run migration in Supabase
- [ ] Create `apps/web/src/features/dm-sync/` folder structure
- [ ] Create `apps/web/src/features/dm-sync/types.ts`
- [ ] Create `apps/web/src/features/dm-sync/lib/` placeholder files

### Files to Create

**`packages/db/schemas/027-dm-sync.sql`:**
```sql
-- DM sync configuration
CREATE TABLE dm_sync_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  skool_community_slug TEXT NOT NULL,
  ghl_location_id TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skool_community_slug)
);

-- Contact mapping (Skool user → GHL contact)
CREATE TABLE dm_contact_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  skool_user_id TEXT NOT NULL,
  skool_username TEXT,
  skool_display_name TEXT,
  ghl_contact_id TEXT NOT NULL,
  match_method TEXT,  -- 'skool_id', 'email', 'name', 'synthetic'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, skool_user_id)
);

-- Message log (deduplication + history)
CREATE TABLE dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  skool_conversation_id TEXT NOT NULL,
  skool_message_id TEXT NOT NULL,
  ghl_message_id TEXT,
  skool_user_id TEXT NOT NULL,
  direction TEXT NOT NULL,  -- 'inbound' | 'outbound'
  message_text TEXT,
  status TEXT DEFAULT 'synced',  -- 'synced' | 'pending' | 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ,
  UNIQUE(user_id, skool_message_id)
);

-- Hand-raiser campaigns
CREATE TABLE dm_hand_raiser_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  post_url TEXT NOT NULL,
  skool_post_id TEXT,
  keyword_filter TEXT,
  dm_template TEXT NOT NULL,
  ghl_tag TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Track sent hand-raiser DMs
CREATE TABLE dm_hand_raiser_sent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES dm_hand_raiser_campaigns(id),
  skool_user_id TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(campaign_id, skool_user_id)
);

-- Indexes
CREATE INDEX idx_dm_messages_user ON dm_messages(user_id);
CREATE INDEX idx_dm_messages_conversation ON dm_messages(skool_conversation_id);
CREATE INDEX idx_dm_contact_mappings_ghl ON dm_contact_mappings(ghl_contact_id);
```

**Feature module structure:**
```
apps/web/src/features/dm-sync/
├── lib/
│   ├── skool-dm-client.ts     # Skool DM API wrapper
│   ├── contact-mapper.ts      # Skool→GHL contact resolution
│   ├── ghl-conversation.ts    # GHL Conversation Provider API
│   └── sync-engine.ts         # Core sync logic
├── types.ts                   # All TypeScript types
└── index.ts                   # Exports
```

### Acceptance Criteria
- [ ] `supabase db push` succeeds
- [ ] Tables visible in Supabase dashboard
- [ ] Feature module compiles (`bun run build` passes)
- [ ] Types exported correctly

### Commit Message
```
Phase 1: DM sync database schema and feature module skeleton
```

---

## Phase 2: Skool DM Client (Server-Side)

**Goal:** Can read DM inbox and conversations via Skool API using SKOOL_COOKIES.

### Deliverables
- [ ] Implement `skool-dm-client.ts` with full API coverage
- [ ] Test: fetch DM inbox list
- [ ] Test: fetch messages in a conversation
- [ ] Test: send a DM (with human-like delay)

### Key Implementation

**`apps/web/src/features/dm-sync/lib/skool-dm-client.ts`:**
```typescript
// Skool API endpoints (discovered from Skoot analysis)
const SKOOL_API = 'https://api2.skool.com';

export class SkoolDmClient {
  private cookies: string;

  constructor() {
    this.cookies = process.env.SKOOL_COOKIES!;
    if (!this.cookies) throw new Error('SKOOL_COOKIES not configured');
  }

  // Get DM inbox (list of conversations)
  async getInbox(offset = 0, limit = 50): Promise<SkoolConversation[]> {
    const res = await fetch(
      `${SKOOL_API}/self/chat-channels?offset=${offset}&limit=${limit}`,
      { headers: { Cookie: this.cookies } }
    );
    return res.json();
  }

  // Get messages in a conversation
  async getMessages(channelId: string): Promise<SkoolMessage[]> {
    const res = await fetch(
      `${SKOOL_API}/chat/${channelId}/messages`,
      { headers: { Cookie: this.cookies } }
    );
    return res.json();
  }

  // Send a DM
  async sendMessage(channelId: string, content: string): Promise<void> {
    // Human-like delay (2-5 seconds)
    await this.humanDelay();

    await fetch(`${SKOOL_API}/chat/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Cookie: this.cookies,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    });
  }

  private async humanDelay(): Promise<void> {
    const delay = 2000 + Math.random() * 3000;
    await new Promise(r => setTimeout(r, delay));
  }
}
```

### Acceptance Criteria
- [ ] `getInbox()` returns conversation list
- [ ] `getMessages(channelId)` returns message history
- [ ] `sendMessage(channelId, text)` sends successfully
- [ ] All methods handle errors gracefully

### Commit Message
```
Phase 2: Skool DM client with inbox, messages, and send
```

---

## Phase 3: Contact Mapper (NO DUPLICATES)

**Goal:** Given a Skool user, find the corresponding GHL contact. Create with REAL data only if truly not found.

### Deliverables
- [ ] Implement `contact-mapper.ts` reusing existing `member-sync.ts` patterns
- [ ] Lookup by cache (fastest)
- [ ] Lookup by email (primary - 97.5% match rate achieved)
- [ ] Lookup by `skool_user_id` custom field (if set from previous sync)
- [ ] Create with REAL email/phone from survey (rare ~1% of cases)
- [ ] Cache all mappings in `dm_contact_mappings` table

### Contact Lookup Strategy

```typescript
import { extractMemberEmail } from '@/features/skool/lib/member-sync';
import { GHLClient } from '@/features/kpi/lib/ghl-client';

export async function findOrCreateGhlContact(
  skoolUserId: string,
  skoolUsername: string,
  skoolDisplayName: string,
  memberData?: SkoolApiMember  // Pass full member data for email/phone extraction
): Promise<string> {
  const ghl = new GHLClient();

  // 1. Check cache first (fastest)
  const cached = await db.query.dm_contact_mappings.findFirst({
    where: eq(dm_contact_mappings.skool_user_id, skoolUserId)
  });
  if (cached) return cached.ghl_contact_id;

  // 2. Also check skool_members table (may already be matched from member sync)
  const existingMember = await supabase
    .from('skool_members')
    .select('ghl_contact_id')
    .eq('skool_user_id', skoolUserId)
    .not('ghl_contact_id', 'is', null)
    .single();

  if (existingMember?.data?.ghl_contact_id) {
    await cacheMapping(skoolUserId, existingMember.data.ghl_contact_id, 'member_table');
    return existingMember.data.ghl_contact_id;
  }

  // 3. Extract email from member data (uses existing robust extraction)
  const email = memberData ? extractMemberEmail(memberData) : null;

  // 4. Search GHL by email (primary strategy - 97.5% match rate)
  if (email) {
    const contact = await ghl.searchContactByEmail(email);
    if (contact) {
      // Update contact with Skool identifiers
      await ghl.updateContact(contact.id, {
        customFields: {
          skool_user_id: skoolUserId,
          skool_username: skoolUsername
        }
      });
      await cacheMapping(skoolUserId, contact.id, 'email');
      return contact.id;
    }
  }

  // 5. Search by skool_user_id custom field (if previously set)
  const byCustomField = await ghl.searchContacts({
    query: skoolUserId,
    field: 'skool_user_id'
  });
  if (byCustomField.length > 0) {
    await cacheMapping(skoolUserId, byCustomField[0].id, 'skool_id');
    return byCustomField[0].id;
  }

  // 6. RARE: Create NEW contact with REAL data (not synthetic)
  // Extract phone from survey (same pattern as email)
  const phone = memberData ? extractMemberPhone(memberData) : null;

  if (!email) {
    // No email = cannot create meaningful contact
    console.warn(`[Contact Mapper] No email for ${skoolUserId}, cannot create contact`);
    throw new Error(`Cannot create contact without email for ${skoolUserId}`);
  }

  const newContact = await ghl.createContact({
    email: email,  // REAL email, not synthetic
    phone: phone || undefined,  // REAL phone if available
    firstName: skoolDisplayName?.split(' ')[0] || skoolUsername,
    lastName: skoolDisplayName?.split(' ').slice(1).join(' ') || undefined,
    tags: ['skool_unmatched', 'created_from_dm_sync'],
    customFields: {
      skool_user_id: skoolUserId,
      skool_username: skoolUsername
    }
  });

  await cacheMapping(skoolUserId, newContact.id, 'created');
  return newContact.id;
}

// Extract phone from survey answers (same pattern as extractMemberEmail)
function extractMemberPhone(member: SkoolApiMember): string | null {
  const surveyRaw = member.member?.metadata?.survey;
  let surveyAnswers: Array<{ question?: string; answer?: string; type?: string }> = [];

  if (typeof surveyRaw === 'string') {
    try {
      const parsed = JSON.parse(surveyRaw);
      surveyAnswers = parsed?.survey || parsed || [];
    } catch { /* ignore */ }
  } else if (Array.isArray(surveyRaw)) {
    surveyAnswers = surveyRaw;
  }

  for (const ans of surveyAnswers) {
    // Check for phone type or phone-like question
    if (ans.type === 'phone' && ans.answer) return ans.answer;
    if (ans.question?.toLowerCase().includes('phone') && ans.answer) return ans.answer;
    // Check for phone-like answer (10+ digits)
    const digits = ans.answer?.replace(/\D/g, '') || '';
    if (digits.length >= 10) return ans.answer;
  }
  return null;
}
```

### GHL Custom Fields Required (Jimmy already created ✅)
- `skool_user_id` (Text) ✅
- `skool_username` (Text) ✅

### Acceptance Criteria
- [ ] Check cache → skool_members table → email search → custom field search
- [ ] 99%+ contacts found via existing methods
- [ ] New contacts created with REAL email/phone (not synthetic)
- [ ] All contacts updated with skool_user_id and skool_username
- [ ] All mappings cached in dm_contact_mappings

### Commit Message
```
Phase 3: Contact mapper with email-first lookup and real data creation
```

---

## Phase 4: GHL Conversation Provider Integration

**Goal:** Can push messages to GHL inbox and receive outbound webhooks.

### Deliverables
- [ ] Implement `ghl-conversation.ts` - Conversation Provider API
- [ ] Create inbound message function (Skool → GHL)
- [ ] Create `/api/webhooks/ghl/outbound-message/route.ts`
- [ ] Webhook signature verification
- [ ] Store outbound messages for processing

### Inbound (Skool → GHL)

```typescript
// apps/web/src/features/dm-sync/lib/ghl-conversation.ts

export async function pushMessageToGhl(
  contactId: string,
  skoolUserId: string,
  messageText: string,
  skoolMessageId: string
): Promise<string> {
  const response = await ghlClient.post('/conversations/messages', {
    contactId,
    channel: 'skool',
    channelContactId: skoolUserId,  // Threading key
    content: { text: messageText },
    altId: skoolMessageId,  // For outbound correlation
    idempotencyKey: crypto.randomUUID()
  });
  return response.messageId;
}
```

### Outbound Webhook (GHL → Skool)

```typescript
// apps/web/src/app/api/webhooks/ghl/outbound-message/route.ts

export async function POST(request: Request) {
  // 1. Verify webhook signature
  if (!verifyGhlSignature(request)) {
    return new Response('Invalid signature', { status: 401 });
  }

  const payload = await request.json();

  // 2. Extract message details
  const { contactId, body, replyToAltId } = payload;

  // 3. Look up Skool user from contact mapping
  const mapping = await db.query.dm_contact_mappings.findFirst({
    where: eq(dm_contact_mappings.ghl_contact_id, contactId)
  });
  if (!mapping) return new Response('Contact not found', { status: 404 });

  // 4. Queue for sending via Skool API
  await db.insert(dm_messages).values({
    user_id: 'jimmy',  // Single user for now
    skool_user_id: mapping.skool_user_id,
    direction: 'outbound',
    message_text: body,
    status: 'pending'
  });

  return new Response('OK');
}
```

### Acceptance Criteria
- [ ] `pushMessageToGhl()` creates message in GHL inbox
- [ ] Messages threaded correctly (same Skool user = same thread)
- [ ] Webhook endpoint validates signatures
- [ ] Outbound messages stored in database

### Commit Message
```
Phase 4: GHL Conversation Provider integration with webhooks
```

---

## Phase 5: Sync Engine + Cron Jobs

**Goal:** Automated polling, syncing, and sending via Vercel Cron.

### Deliverables
- [ ] Implement `sync-engine.ts` - orchestrates full sync
- [ ] Create `/api/cron/sync-skool-dms/route.ts` (every 5 min)
- [ ] Create `/api/cron/send-pending-dms/route.ts` (every 5 min)
- [ ] Add cron schedules to `vercel.json`
- [ ] Deduplication via `dm_messages` table

### Sync Engine

```typescript
// apps/web/src/features/dm-sync/lib/sync-engine.ts

export async function syncInboundMessages(): Promise<SyncResult> {
  const client = new SkoolDmClient();
  const conversations = await client.getInbox();

  let synced = 0;

  for (const conv of conversations) {
    const messages = await client.getMessages(conv.id);

    for (const msg of messages) {
      // Skip if already synced
      const exists = await db.query.dm_messages.findFirst({
        where: eq(dm_messages.skool_message_id, msg.id)
      });
      if (exists) continue;

      // Skip outbound (we sent it)
      if (msg.senderId === 'me') continue;

      // Find/create GHL contact
      const ghlContactId = await findOrCreateGhlContact(
        msg.senderId,
        msg.senderUsername,
        msg.senderName
      );

      // Push to GHL
      const ghlMsgId = await pushMessageToGhl(
        ghlContactId,
        msg.senderId,
        msg.content,
        msg.id
      );

      // Record sync
      await db.insert(dm_messages).values({
        user_id: 'jimmy',
        skool_conversation_id: conv.id,
        skool_message_id: msg.id,
        ghl_message_id: ghlMsgId,
        skool_user_id: msg.senderId,
        direction: 'inbound',
        message_text: msg.content,
        status: 'synced',
        synced_at: new Date()
      });

      synced++;
    }
  }

  return { synced };
}

export async function sendPendingMessages(): Promise<SendResult> {
  const client = new SkoolDmClient();

  const pending = await db.query.dm_messages.findMany({
    where: and(
      eq(dm_messages.direction, 'outbound'),
      eq(dm_messages.status, 'pending')
    )
  });

  let sent = 0;

  for (const msg of pending) {
    // Find Skool conversation for this user
    const mapping = await db.query.dm_contact_mappings.findFirst({
      where: eq(dm_contact_mappings.skool_user_id, msg.skool_user_id)
    });

    // Need conversation ID - may need to look up or start new
    // For now, assume we have it from previous inbound sync

    await client.sendMessage(msg.skool_conversation_id, msg.message_text);

    await db.update(dm_messages)
      .set({ status: 'sent', synced_at: new Date() })
      .where(eq(dm_messages.id, msg.id));

    sent++;
  }

  return { sent };
}
```

### Cron Routes

```typescript
// apps/web/src/app/api/cron/sync-skool-dms/route.ts
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await syncInboundMessages();
  return Response.json(result);
}

// apps/web/src/app/api/cron/send-pending-dms/route.ts
export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await sendPendingMessages();
  return Response.json(result);
}
```

### Vercel Config

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-skool-dms",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/send-pending-dms",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### Acceptance Criteria
- [ ] Inbound sync detects new messages
- [ ] Messages pushed to GHL with correct threading
- [ ] Outbound messages sent via Skool API
- [ ] Deduplication prevents double-syncing
- [ ] Cron jobs execute on schedule

### Commit Message
```
Phase 5: Sync engine with automated cron jobs
```

---

## Phase 6: GHL Conversation Provider Registration

**Goal:** Register as a Conversation Provider so messages appear in unified inbox.

### Deliverables
- [ ] Create one-time registration script
- [ ] Register "Skool DMs" channel in GHL
- [ ] Verify messages appear with correct channel icon
- [ ] Document the registration process

### Registration

```typescript
// scripts/register-ghl-provider.ts

async function registerSkoolProvider() {
  const response = await ghlClient.post('/conversations/providers/install', {
    locationId: process.env.GHL_LOCATION_ID,
    name: 'Skool DMs',
    type: 'Custom',
    inboundUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/ghl/inbound`,
    outboundUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/ghl/outbound-message`,
    supportedFeatures: ['inbound', 'outbound']
  });

  console.log('Provider registered:', response);
}
```

### Acceptance Criteria
- [ ] Provider registered successfully
- [ ] "Skool DMs" appears as channel in GHL inbox
- [ ] Inbound messages show under this channel
- [ ] Replies route through outbound webhook

### Commit Message
```
Phase 6: GHL Conversation Provider registration
```

---

## Phase 7: Hand-Raiser Automation (Optional)

**Goal:** Auto-DM people who comment on specific Skool posts.

### Deliverables
- [ ] Create `/api/cron/hand-raiser-check/route.ts`
- [ ] Implement post comment monitoring
- [ ] Queue auto-DMs for new commenters
- [ ] Tag contacts in GHL

### Acceptance Criteria
- [ ] Detects new comments on monitored posts
- [ ] Sends DM only once per user per campaign
- [ ] Tags contact in GHL with campaign tag

### Commit Message
```
Phase 7: Hand-raiser automation
```

---

## Environment Variables

Add to `.env`:

```bash
# Already have these:
SKOOL_COOKIES=xxx            # From GitHub Action

# New for DM sync:
GHL_WEBHOOK_SECRET=xxx       # For webhook signature verification

# Existing GHL vars (should already exist):
GHL_LOCATION_ID=xxx
GHL_ACCESS_TOKEN=xxx
```

---

## Files Summary

| File | Phase | Purpose |
|------|-------|---------|
| `packages/db/schemas/027-dm-sync.sql` | 1 | Database tables |
| `features/dm-sync/types.ts` | 1 | TypeScript types |
| `features/dm-sync/lib/skool-dm-client.ts` | 2 | Skool API wrapper |
| `features/dm-sync/lib/contact-mapper.ts` | 3 | Skool→GHL mapping |
| `features/dm-sync/lib/ghl-conversation.ts` | 4 | GHL Provider API |
| `app/api/webhooks/ghl/outbound-message/route.ts` | 4 | GHL webhook |
| `features/dm-sync/lib/sync-engine.ts` | 5 | Core sync logic |
| `app/api/cron/sync-skool-dms/route.ts` | 5 | Inbound cron |
| `app/api/cron/send-pending-dms/route.ts` | 5 | Outbound cron |
| `scripts/register-ghl-provider.ts` | 6 | One-time setup |

---

## Agent Deployment Template

For each phase, deploy agent with:

```
You are working on 0ne-app at: /Users/jimmyfuentes/Library/Mobile Documents/com~apple~CloudDocs/06 - Code/0ne/03 - BUILD/03-1 - Apps/0ne-app

**Your Task: Complete Phase [N] - [Name]**

[Copy phase deliverables from this plan]

## Context
- This is a cloud-only Skool-GHL DM sync feature
- Uses existing SKOOL_COOKIES env var (server-side, no browser needed)
- Follows existing 0ne-app patterns (Supabase, GHL client, cron jobs)
- Read existing skool feature at `features/skool/` for patterns

## Key Files to Read First
- `features/kpi/lib/ghl-client.ts` - existing GHL client
- `features/skool/lib/skool-client.ts` - existing Skool patterns
- `app/api/cron/` - existing cron job patterns

## Deliverables
[List from phase]

## On Completion
1. Ensure code compiles: `bun run build`
2. Report what you created/modified
3. Report any issues or questions

DO NOT push. Just report completion.
```

---

## Verification Checklist (After All Phases)

- [ ] Tables exist in Supabase
- [ ] Inbound: Skool DM → appears in GHL inbox
- [ ] Outbound: GHL reply → appears in Skool DM
- [ ] Threading: Same Skool user = same GHL thread
- [ ] Deduplication: No duplicate messages
- [ ] Crons running on schedule

---

## Contingency: Public/SaaS Expansion

> **Not a phase. Only implement if/when needed.**

If this ever becomes a public SaaS:

### What Changes
1. **Chrome Extension** - Each user's browser scrapes Skool (their IP, their session)
2. **Multi-tenant** - Per-org database isolation, Clerk orgs
3. **GHL Marketplace App** - Each customer connects their own GHL
4. **Billing** - Stripe usage-based metering

### Why Extension for SaaS
- Can't store other people's SKOOL_COOKIES server-side
- Each user needs their own IP for scraping (avoids rate limits)
- Browser session management is complex for multi-tenant

### Architecture Change
```
# Private (current):
Server (your cookies) → Skool API → GHL

# Public (future):
Extension (user's browser) → Your API → GHL
```

### Files to Add (If Needed)
- `apps/extension/` - Chrome Extension
- `app/api/extension/` - Extension API routes
- Multi-tenant database schema changes

---

## Next Step

Ready for Phase 1 agent deployment when you wake up.

**Command:** "Deploy Phase 1" or "Deploy all phases sequentially"
