-- Table invites: host can invite friends to join an open game table
CREATE TABLE IF NOT EXISTS table_invites (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    to_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '5 minutes',
    UNIQUE (game_id, to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_table_invites_to_user ON table_invites (to_user_id, status);
CREATE INDEX IF NOT EXISTS idx_table_invites_game ON table_invites (game_id);

ALTER TABLE table_invites ENABLE ROW LEVEL SECURITY;

-- Invited user can read their own invites
CREATE POLICY "table_invites_select_own" ON table_invites
    FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- Only authenticated users can send invites
CREATE POLICY "table_invites_insert" ON table_invites
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Invited user can update status (accept/decline)
CREATE POLICY "table_invites_update" ON table_invites
    FOR UPDATE USING (auth.uid() = to_user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE table_invites;
