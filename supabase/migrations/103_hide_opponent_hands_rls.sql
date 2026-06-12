-- ============================================
-- Migration 103: Esconder as cartas dos adversários (RLS) — PRONTO PARA PRODUÇÃO
-- ------------------------------------------------------------------
-- Problema: games/game_players/game_moves não tinham RLS. O cliente fazia
-- select('*') em game_players e recebia a coluna `hand` (a mão) de TODOS —
-- dava para ler as cartas dos adversários (via REST direto ou WebSocket).
--
-- Solução (com blast-radius mínimo graças à exceção "waiting"):
--   • RLS ligado nas 3 tabelas.
--   • Enquanto a mesa está "waiting" (sem cartas distribuídas), as linhas ficam
--     visíveis — isto mantém o lobby, a contagem de lugares e os convites a
--     funcionar normalmente.
--   • Quando a mesa passa a "playing", cada jogador só vê a SUA linha de
--     game_players (logo, só a SUA mão). A mão dos outros deixa de sair pela API
--     e pelo realtime.
--   • A própria mão e o estado público da mesa passam a ser servidos pela função
--     get_table_state() (SECURITY DEFINER), que devolve a mão SÓ do próprio
--     utilizador + hand_count dos restantes.
--   • Escritas (jogadas, distribuição, fim de jogo) continuam pelas RPCs
--     SECURITY DEFINER (process_*) e pelo watchdog com service role — ambos
--     ignoram RLS.
--
-- Pré-requisito de código (já aplicado neste commit): o watchdog e as leituras
-- de servidor passaram a usar a service role; o cliente passou a usar
-- get_table_state(). Sem essas alterações, ligar este RLS trava jogadas AFK.
--
-- ROLLBACK (no fim do ficheiro) se precisares de voltar atrás.
-- ============================================

-- ------------------------------------------------------------------
-- 1. get_table_state(game_id): estado da mesa SEM vazar mãos alheias
-- ------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_table_state(p_game_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_is_member BOOLEAN;
  v_players JSONB;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = p_game_id AND user_id = v_uid
  ) INTO v_is_member;

  IF NOT v_is_member THEN
    RETURN jsonb_build_object('error', 'forbidden', 'players', '[]'::jsonb);
  END IF;

  SELECT jsonb_agg(
    jsonb_build_object(
      'id', gp.id,
      'user_id', gp.user_id,
      'position', gp.position,
      'team', gp.team,
      'hand_count', COALESCE(jsonb_array_length(gp.hand), 0),
      -- só devolve as cartas reais se a linha for do próprio utilizador
      'hand', CASE WHEN gp.user_id = v_uid THEN COALESCE(gp.hand, '[]'::jsonb) ELSE '[]'::jsonb END,
      'profiles', jsonb_build_object('username', p.username, 'avatar_url', p.avatar_url)
    ) ORDER BY gp.position
  )
  INTO v_players
  FROM public.game_players gp
  LEFT JOIN public.profiles p ON p.id = gp.user_id
  WHERE gp.game_id = p_game_id;

  RETURN jsonb_build_object('players', COALESCE(v_players, '[]'::jsonb));
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_table_state(UUID) TO authenticated;

-- ------------------------------------------------------------------
-- 2. Ligar RLS
-- ------------------------------------------------------------------
ALTER TABLE public.games        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves   ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------
-- 3. Políticas de SELECT
--    (sem políticas de INSERT/UPDATE/DELETE => essas operações só por
--     SECURITY DEFINER / service role, que ignoram RLS)
-- ------------------------------------------------------------------

-- games: participa na mesa OU a mesa está aberta no lobby (waiting)
DROP POLICY IF EXISTS games_select ON public.games;
CREATE POLICY games_select ON public.games
  FOR SELECT TO authenticated
  USING (
    status = 'waiting'
    OR host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.game_players gp
      WHERE gp.game_id = games.id AND gp.user_id = auth.uid()
    )
  );

-- game_players: a SUA linha SEMPRE; as dos outros só enquanto a mesa está
-- "waiting" (ainda sem cartas). Em "playing", só a própria => mãos protegidas.
DROP POLICY IF EXISTS game_players_select ON public.game_players;
CREATE POLICY game_players_select ON public.game_players
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.games g
      WHERE g.id = game_players.game_id AND g.status = 'waiting'
    )
  );

-- game_moves: cartas já jogadas são públicas para quem está na mesa
DROP POLICY IF EXISTS game_moves_select ON public.game_moves;
CREATE POLICY game_moves_select ON public.game_moves
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.game_players gp
      WHERE gp.game_id = game_moves.game_id AND gp.user_id = auth.uid()
    )
  );

-- ============================================================
-- ROLLBACK (correr só se necessário voltar ao comportamento anterior):
--
--   DROP POLICY IF EXISTS games_select        ON public.games;
--   DROP POLICY IF EXISTS game_players_select ON public.game_players;
--   DROP POLICY IF EXISTS game_moves_select   ON public.game_moves;
--   ALTER TABLE public.games        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.game_players DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.game_moves   DISABLE ROW LEVEL SECURITY;
--   -- (e reverter o commit de código que usa service role / get_table_state)
-- ============================================================
