# Scripts

One-time setup and maintenance scripts for the 0ne app.

## GHL Conversation Provider Registration

### `register-ghl-provider.ts`

Registers the "Skool" custom channel with GoHighLevel's Conversation Provider API. This allows Skool DMs to appear in the GHL unified inbox.

**This is a one-time setup operation.**

### Prerequisites

1. **GHL Marketplace App** - Create an app in the GHL Developer Portal with:
   - OAuth scopes: `conversations.readonly`, `conversations.write`
   - Install the app to your GHL location

2. **Environment Variables** - Add these to `.env.local`:
   ```env
   GHL_MARKETPLACE_CLIENT_ID=your_client_id
   GHL_MARKETPLACE_CLIENT_SECRET=your_client_secret
   GHL_LOCATION_ID=your_location_id
   NEXT_PUBLIC_APP_URL=https://your-deployed-app.vercel.app
   ```

3. **Deployed App** - Your app must be deployed and accessible at `NEXT_PUBLIC_APP_URL`. GHL will call the outbound webhook at:
   ```
   {NEXT_PUBLIC_APP_URL}/api/webhooks/ghl/outbound-message
   ```

### Running the Script

```bash
# From the monorepo root
bun run apps/web/scripts/register-ghl-provider.ts

# Or from apps/web
cd apps/web && bun run scripts/register-ghl-provider.ts
```

### Output

On success, the script outputs:
```
SUCCESS! Skool provider registered.

Provider details:
  Provider ID: abc123...
  Name: Skool

NEXT STEPS:
1. Add this line to your .env.local:
   GHL_CONVERSATION_PROVIDER_ID=abc123...

2. Add the same variable to Vercel environment variables

3. Redeploy your app
```

### Troubleshooting

| Error | Solution |
|-------|----------|
| OAuth token request failed | Verify client_id and client_secret are correct |
| Provider registration failed: 401 | Ensure app is installed to the location |
| Provider registration failed: 403 | Check app has required OAuth scopes |
| Missing environment variable | Add the missing variable to .env.local |

### Re-registration

If you need to re-register (e.g., different location), first remove `GHL_CONVERSATION_PROVIDER_ID` from your environment, then run the script again.

**Warning:** Re-registration may create duplicate providers in GHL.

---

## Other Scripts

### `import-member-export.ts`

Imports Skool member export CSV data into the database. See script header for usage.
