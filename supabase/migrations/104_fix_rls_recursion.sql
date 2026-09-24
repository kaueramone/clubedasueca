-- ============================================
-- Migration 104: HOTFIX — recursão infinita nas políticas RLS
-- ------------------------------------------------------------------
-- Sintoma: "infinite recursion detected in policy for relation games".
-- Causa: na migração 103, a política de SELECT de `games` consultava
--        `game_players`, e a de `game_players` consultava `games` — cada uma
--        dispara a RLS da outra, em loop infinito.
-- Correção: os testes cruzados passam por funções SECURITY DEFINER (executam
--        como owner → ignoram RLS), por isso já não disparam as políticas uma
--        da outra e a recursão desaparece. A lógica de visibilidade é a MESMA
--        da 103 (participa na mesa, é host, ou a mesa está em "waiting").
-- ============================================

-- 1. Helpers SECURITY DEFINER (ignoram RLS → não há recursão)
CREATE OR REPLACE FUNCTION public.is_game_participant(p_game_id UUID, p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.game_players
    WHERE game_id = p_game_id AND user_id = p_uid
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_game_participant(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_game_waiting(p_game_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.games
    WHERE id = p_game_id AND status = 'waiting'
  );
$$;
GRANT EXECUTE ON FUNCTION public.is_game_waiting(UUID) TO authenticated;

-- 2. Recriar as políticas SEM auto-referência cruzada

-- games: participa na mesa, é host, OU a mesa está aberta no lobby (waiting).
-- (status e host_id são colunas da própria linha avaliada — não há recursão;
--  a pertença vai pela função SECURITY DEFINER.)
DROP POLICY IF EXISTS games_select ON public.games;
CREATE POLICY games_select ON public.games
  FOR SELECT TO authenticated
  USING (
    status = 'waiting'
    OR host_id = auth.uid()
    OR public.is_game_participant(id, auth.uid())
  );

-- game_players: a SUA linha SEMPRE; as dos outros só enquanto a mesa está
-- "waiting" (ainda sem cartas). Em "playing", só a própria → mãos protegidas.
DROP POLICY IF EXISTS game_players_select ON public.game_players;
CREATE POLICY game_players_select ON public.game_players
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_game_waiting(game_id)
  );

-- game_moves: quem participa na mesa (cartas já jogadas são públicas).
DROP POLICY IF EXISTS game_moves_select ON public.game_moves;
CREATE POLICY game_moves_select ON public.game_moves
  FOR SELECT TO authenticated
  USING (
    public.is_game_participant(game_id, auth.uid())
  );

-- ============================================================
-- ROLLBACK total da proteção (se necessário voltar atrás):
--   DROP POLICY IF EXISTS games_select        ON public.games;
--   DROP POLICY IF EXISTS game_players_select ON public.game_players;
--   DROP POLICY IF EXISTS game_moves_select   ON public.game_moves;
--   ALTER TABLE public.games        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.game_players DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.game_moves   DISABLE ROW LEVEL SECURITY;
-- ============================================================
