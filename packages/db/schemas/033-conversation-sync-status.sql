-- Migration 033: Conversation Sync Status
-- Tracks per-conversation sync state for the Skool DM backfill feature
-- Allows incremental sync by knowing where we left off for each conversation

-- ================================================
-- Table: conversation_sync_status
-- ================================================

CREATE TABLE IF NOT EXISTS conversation_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who owns this sync status
  staff_skool_id TEXT NOT NULL,

  -- The conversation being tracked
  conversation_id TEXT NOT NULL,
  participant_name TEXT,

  -- Sync progress tracking
  last_synced_message_id TEXT,           -- ID of the most recent message we've synced
  last_synced_message_time TIMESTAMPTZ,  -- Timestamp of that message
  backfill_complete BOOLEAN DEFAULT FALSE, -- True when we've fetched all historical messages

  -- Stats
  last_sync_time TIMESTAMPTZ DEFAULT NOW(), -- When we last synced this conversation
  total_messages_synced INTEGER DEFAULT 0,  -- Running count of messages synced

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each staff member has their own sync status per conversation
  UNIQUE(staff_skool_id, conversation_id)
);

-- Index for efficient lookup by staff
CREATE INDEX IF NOT EXISTS idx_conversation_sync_staff
  ON conversation_sync_status(staff_skool_id);

-- Index for finding incomplete backfills
CREATE INDEX IF NOT EXISTS idx_conversation_sync_incomplete
  ON conversation_sync_status(staff_skool_id, backfill_complete)
  WHERE backfill_complete = FALSE;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_conversation_sync_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_conversation_sync_updated_at ON conversation_sync_status;
CREATE TRIGGER trg_conversation_sync_updated_at
  BEFORE UPDATE ON conversation_sync_status
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_sync_updated_at();

-- Comments for documentation
COMMENT ON TABLE conversation_sync_status IS 'Tracks per-conversation sync state for Skool DM backfill';
COMMENT ON COLUMN conversation_sync_status.staff_skool_id IS 'Skool user ID of the staff member';
COMMENT ON COLUMN conversation_sync_status.conversation_id IS 'Skool conversation/channel ID';
COMMENT ON COLUMN conversation_sync_status.last_synced_message_id IS 'ID of the newest message synced - used as anchor for incremental sync';
COMMENT ON COLUMN conversation_sync_status.backfill_complete IS 'True when full history has been fetched';
COMMENT ON COLUMN conversation_sync_status.total_messages_synced IS 'Cumulative count of messages synced for this conversation';
