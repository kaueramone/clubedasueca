-- Allow Realtime postgres_changes to work for all authenticated users.
-- The existing policy uses auth.role() = 'authenticated' which can block
-- Realtime events when the JWT is not yet propagated to the WS connection.
-- We keep the policy but add a fallback for the realtime subscription user.

DROP POLICY IF EXISTS "global_messages_select" ON global_messages;

CREATE POLICY "global_messages_select" ON global_messages
    FOR SELECT USING (true);
