-- Enable realtime for games and game_players tables
ALTER PUBLICATION supabase_realtime ADD TABLE games;
ALTER PUBLICATION supabase_realtime ADD TABLE game_players;

-- Add team context to table_invites
ALTER TABLE table_invites ADD COLUMN IF NOT EXISTS team TEXT CHECK (team IN ('A', 'B'));
