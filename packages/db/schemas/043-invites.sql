-- 043: Invite system for gated sign-ups
-- Users can only sign up with a valid invite from an admin.

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual', 'skool', 'stripe')),
  skool_member_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  invite_token UUID NOT NULL DEFAULT gen_random_uuid(),
  clerk_user_id TEXT,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_invites_token ON invites (invite_token);
CREATE INDEX idx_invites_email ON invites (email);
CREATE INDEX idx_invites_status ON invites (status) WHERE status = 'pending';
