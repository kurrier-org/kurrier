CREATE TABLE vacation_settings (
 identity_id uuid PRIMARY KEY REFERENCES identities(id) ON DELETE CASCADE,
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 subject text NOT NULL DEFAULT '',
 message text NOT NULL DEFAULT '',
 starts_at timestamptz,
 ends_at timestamptz,
 activated_at timestamptz NOT NULL DEFAULT now(),
 period_id uuid NOT NULL DEFAULT gen_random_uuid(),
 CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);
CREATE TABLE vacation_replies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 identity_id uuid NOT NULL REFERENCES identities(id) ON DELETE CASCADE,
 workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
 period_id uuid NOT NULL,
 recipient text NOT NULL,
 message_id uuid REFERENCES messages(id) ON DELETE SET NULL,
 status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','accepted','reconciling','reconciled','unknown','cancelled')),
 provider_message_id text,
 payload jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 attempted_at timestamptz,
 UNIQUE(identity_id,period_id,recipient)
);
CREATE INDEX vacation_pending ON vacation_replies(status,created_at);
ALTER TABLE vacation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_replies ENABLE ROW LEVEL SECURITY;
-- These tables are accessed by authenticated server actions and the privileged worker.
-- The application RLS role receives no direct policy for delivery-state mutation.
