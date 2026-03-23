-- Add scope column to plaid_accounts for personal vs business classification
-- NULL = unassigned, 'personal' = personal app, 'business' = KPI dashboard
ALTER TABLE plaid_accounts ADD COLUMN IF NOT EXISTS scope TEXT CHECK (scope IN ('personal', 'business'));

CREATE INDEX IF NOT EXISTS idx_plaid_accounts_scope ON plaid_accounts(scope);
