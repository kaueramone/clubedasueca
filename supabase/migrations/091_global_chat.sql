-- Global chat messages (lobby chat visible on homepage)
CREATE TABLE IF NOT EXISTS global_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast recent messages fetch
CREATE INDEX IF NOT EXISTS idx_global_messages_created_at ON global_messages (created_at DESC);

-- RLS
ALTER TABLE global_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "global_messages_select" ON global_messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only owner can insert their own messages
CREATE POLICY "global_messages_insert" ON global_messages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE global_messages;
