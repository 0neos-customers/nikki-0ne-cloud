# 0ne App - Build State

> **For Claude Code:** Read this file FIRST when working on 0ne-app.
> This is the nimble hub - it points you to the right place.

---

## Quick Resume

**Last Updated:** 2026-02-16
**Current Focus:** GHL ↔ Skool bidirectional sync WORKING - cleanup tasks below

**Session 2026-02-16 Summary:**
- ✅ Fixed GHL → Skool outbound messaging (webhook wasn't working)
- ✅ Fixed signature verification (GHL CP webhooks don't use signatures)
- ✅ Fixed message field mapping (`message` not `body`)
- ✅ Fixed user ID mismatch (Clerk vs Skool ID)
- ✅ Removed prefix from outbound Skool messages
- ✅ Added conversationProviderId validation for security

---

## Active Features

| Feature | Status | BUILD-STATE Location |
|---------|--------|---------------------|
| Skool-GHL DM Sync | ✅ Working | `sections/skool-sync/BUILD-STATE.md` |
| Skool Inbox | ✅ Complete | `sections/skool-inbox/BUILD-STATE.md` |
| Hand-Raiser Extension Routing | 🔄 Deploy | `sections/hand-raiser-extension-routing/BUILD-STATE.md` |
| Skool Chrome Extension | ✅ Complete | `sections/skool-extension/BUILD-STATE.md` |
| Hand-Raiser UI | ⬜ Planned | `sections/hand-raiser-ui/BUILD-STATE.md` |
| Cron Fix + Sync Dashboard | ✅ Complete | `sections/sync-dashboard/BUILD-STATE.md` |
| Skool Scheduler | ✅ Complete | `sections/skool-scheduler/BUILD-STATE.md` |
| GHL Media Manager | ✅ Complete | `sections/media/BUILD-STATE.md` |

### How to Navigate

**Starting a feature:** Read the feature's BUILD-STATE in `sections/{feature}/BUILD-STATE.md`

**Checking history:** Read `COMPLETED-FEATURES.md` for archived implementation details

---

## Next Actions

### Hand-Raiser Campaign UI (Queued)
**Build UI to manage Hand-Raiser campaigns (auto-DM Skool commenters)**

**To deploy:** Read `sections/hand-raiser-ui/BUILD-STATE.md` and deploy 4 phases using multi-agent workflow:
1. Spawn Phases 1-3 in parallel (API, Hook, Dialog)
2. Then Phase 4 (Page + Navigation)

---

## Cleanup Tasks (from 2026-02-16 session)

1. **Clean up old pending GHL messages** (~3500 messages older than 24 hours)
   ```sql
   UPDATE dm_messages SET status = 'failed'
   WHERE source = 'ghl' AND status = 'pending'
   AND created_at < NOW() - INTERVAL '24 hours';
   ```

2. **Optional: Reduce webhook logging** - Currently verbose for debugging, can trim later

---

## Blockers / Decisions Needed

None currently.

---

## Architecture Note: Extension-First Skool Integration (2026-02-16)

AWS WAF blocks all server-side Skool API calls. The Chrome extension is the **sole data collector** for Skool.

**Killed crons:**
- `sync-skool` (daily member/KPI fetch) - removed from vercel.json
- `syncInboundMessages` in `sync-skool-dms` - removed (server-side Skool fetch)

**Active crons (non-Skool or processing only):**
- `sync-ghl` - GHL data sync (daily)
- `sync-meta` - Meta ads sync (daily)
- `aggregate` - Data aggregation (daily)
- `send-daily-snapshot` - Notifications (daily)
- `sync-skool-dms` - Extension message processing → GHL only (every 5min)
- `send-pending-dms` - Outbound DM queue (every 5min)
- `hand-raiser-check` - Comment analysis (every 15min)

---

## Quick Commands

```bash
# Start dev server
cd apps/web && bun dev

# Run GHL sync
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-ghl"

# Run Meta ads sync
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-meta"
```

---

## Completed Features

See `COMPLETED-FEATURES.md` for full archive. Summary:

- ✅ KPI Dashboard (Overview, Funnel, Cohorts, Expenses, Skool, GHL, Facebook Ads)
- ✅ Skool Post Scheduler (Variation Groups, Campaigns, One-Off Posts)
- ✅ Skool Post Drafts & External API
- ✅ GHL Media Manager
- ✅ Sync Dashboard
- ✅ Daily Notifications
- ✅ Source Filtering System
- ✅ Expenses System Upgrade
- ✅ Skool Revenue & MRR Integration
- ✅ Skool-GHL DM Sync (bidirectional - Skool↔GHL↔0ne Inbox all working as of 2026-02-16)
- ✅ Skool Chrome Extension (12 phases: API intercept, WebSocket, DM send, multi-staff, cookies, auth, members/KPI/analytics, scheduler, polling, backfill)
