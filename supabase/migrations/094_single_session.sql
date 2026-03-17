-- Single-session enforcement: track the active session per user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_id UUID DEFAULT gen_random_uuid();

-- Allow realtime on profiles so the SessionGuard can detect session changes
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
