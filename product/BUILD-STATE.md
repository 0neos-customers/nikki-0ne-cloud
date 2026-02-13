# 0ne App - Build State

> **For Claude Code:** Read this file FIRST when working on 0ne-app.
> This is the nimble hub - it points you to the right place.

---

## Quick Resume

**Last Updated:** 2026-02-12
**Current Focus:** Skool-GHL DM Sync (Phase 1 pending)

---

## Active Features

| Feature | Status | BUILD-STATE Location |
|---------|--------|---------------------|
| Skool-GHL DM Sync | 🔄 Phase 1 Pending | `sections/skool-sync/BUILD-STATE.md` |
| Skool Scheduler | ✅ Complete | `sections/skool-scheduler/BUILD-STATE.md` |
| GHL Media Manager | ✅ Complete | `sections/media/BUILD-STATE.md` |

### How to Navigate

**Starting a feature:** Read the feature's BUILD-STATE in `sections/{feature}/BUILD-STATE.md`

**Checking history:** Read `COMPLETED-FEATURES.md` for archived implementation details

---

## Next Actions

### Skool-GHL DM Sync
Cloud-only integration to sync Skool DMs with GHL unified inbox.

**✅ Marketplace App Ready** (credentials in Vercel)

**To start Phase 1:** Read `sections/skool-sync/BUILD-STATE.md` and deploy

**Architecture:**
```
Vercel Cron → Skool API (SKOOL_COOKIES) → Supabase → GHL Conversation Provider API (Marketplace)
```

**Key Requirement:** 100% contact match rate (no duplicates, no synthetic contacts)

---

## Blockers / Decisions Needed

1. **Jimmy Action:** Add `EXTERNAL_API_KEY` to Vercel environment (for Skool Post Drafts API)

---

## Quick Commands

```bash
# Start dev server
cd apps/web && bun dev

# Run GHL sync
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-ghl"

# Run Skool member sync
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/sync-skool"

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
