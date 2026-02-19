-- 037-contact-channels.sql
-- Conversation Channel Management: per-staff channel cache + community ID

-- 1. Add skool_community_id to dm_sync_config
ALTER TABLE dm_sync_config ADD COLUMN IF NOT EXISTS skool_community_id TEXT;

-- 2. New table: contact_channels (per-staff channel cache)
CREATE TABLE IF NOT EXISTS contact_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  skool_user_id TEXT NOT NULL,
  staff_skool_id TEXT NOT NULL,
  skool_channel_id TEXT NOT NULL,
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clerk_user_id, skool_user_id, staff_skool_id)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_contact_channels_staff_user ON contact_channels(staff_skool_id, skool_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_channels_skool_user ON contact_channels(skool_user_id);
CREATE INDEX IF NOT EXISTS idx_contact_channels_channel ON contact_channels(skool_channel_id);

-- 4. RLS
ALTER TABLE contact_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON contact_channels FOR ALL USING (true);
