-- 045: Add cloud_user_id and install_token to telemetry_events
-- Links install/doctor telemetry to cloud user accounts.

ALTER TABLE telemetry_events
  ADD COLUMN IF NOT EXISTS cloud_user_id TEXT,
  ADD COLUMN IF NOT EXISTS install_token UUID;

CREATE INDEX IF NOT EXISTS idx_telemetry_events_cloud_user
  ON telemetry_events (cloud_user_id)
  WHERE cloud_user_id IS NOT NULL;
