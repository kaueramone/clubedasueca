-- ============================================
-- Migration 003: Game Scoring Columns
-- Adiciona colunas para pontuação real e estado do jogo
-- ============================================

-- Garantir que as colunas de pontuação existem na tabela games
-- (podem já existir parcialmente do schema original)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS score_a INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_b INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trump_suit TEXT,
  ADD COLUMN IF NOT EXISTS current_turn INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_trick INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_round INTEGER DEFAULT 1;

-- Adicionar campo hand como JSONB para guardar cartas na mão
ALTER TABLE public.game_players
  ADD COLUMN IF NOT EXISTS hand JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS tricks_won JSONB DEFAULT '[]'::jsonb;

-- Índice para consultas frequentes de estado do jogo
CREATE INDEX IF NOT EXISTS idx_games_status ON public.games(status);
CREATE INDEX IF NOT EXISTS idx_game_players_game ON public.game_players(game_id);
CREATE INDEX IF NOT EXISTS idx_game_moves_game_trick ON public.game_moves(game_id, round_number, trick_number);
