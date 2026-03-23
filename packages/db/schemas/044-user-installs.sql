-- 044: User installs - links cloud users to their local 0ne installations
-- Install token gets baked into the zip download, sent back via telemetry.

CREATE TABLE IF NOT EXISTS user_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT NOT NULL,
  install_token UUID NOT NULL DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'downloaded', 'connected', 'verified')),
  platform TEXT,
  arch TEXT,
  os_version TEXT,
  bun_version TEXT,
  one_version TEXT,
  principal_name TEXT,
  downloaded_at TIMESTAMPTZ,
  connected_at TIMESTAMPTZ,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_install_token UNIQUE (install_token),
  CONSTRAINT unique_user_install UNIQUE (clerk_user_id)
);

CREATE INDEX idx_user_installs_token ON user_installs (install_token);
CREATE INDEX idx_user_installs_clerk_user ON user_installs (clerk_user_id);
