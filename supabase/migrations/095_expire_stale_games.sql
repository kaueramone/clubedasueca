-- ============================================
-- Migration 095: Expire Stale Waiting Games
-- Cancela e reembolsa automaticamente mesas que ficam em 'waiting'
-- por mais de N minutos sem encher (4 jogadores).
-- Roda via pg_cron (a cada minuto) + reforco best-effort no lobby.
-- ============================================

-- Indice para a varredura ser barata
CREATE INDEX IF NOT EXISTS idx_games_status_created
  ON public.games (status, created_at);

-- ============================================
-- RPC: expire_stale_games
-- Reembolsa todos os jogadores das mesas 'waiting' antigas e apaga as mesas.
-- p_timeout_minutes: idade minima (em minutos) para a mesa ser considerada obsoleta.
-- Retorna a quantidade de mesas expiradas.
-- ============================================
CREATE OR REPLACE FUNCTION public.expire_stale_games(
  p_timeout_minutes INTEGER DEFAULT 10
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player RECORD;
  v_wallet_id UUID;
  v_expired_count INTEGER := 0;
BEGIN
  -- Seleciona mesas obsoletas com lock, pulando linhas ja travadas por
  -- outra transacao (ex: um join/cancel acontecendo ao mesmo tempo).
  FOR v_game IN
    SELECT id, stake
    FROM public.games
    WHERE status = 'waiting'
      AND created_at < NOW() - (p_timeout_minutes || ' minutes')::INTERVAL
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Reembolsa cada jogador ainda na mesa
    FOR v_player IN
      SELECT user_id FROM public.game_players WHERE game_id = v_game.id
    LOOP
      SELECT id INTO v_wallet_id
      FROM public.wallets
      WHERE user_id = v_player.user_id
      FOR UPDATE;

      IF v_wallet_id IS NOT NULL THEN
        UPDATE public.wallets
        SET balance = balance + v_game.stake, updated_at = NOW()
        WHERE id = v_wallet_id;

        INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
        VALUES (v_wallet_id, v_game.stake, 'refund',
          format('Mesa expirada por inatividade %s', LEFT(v_game.id::text, 8)), v_game.id);
      END IF;
    END LOOP;

    -- Audit (sem user_id especifico: acao do sistema)
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (NULL, 'expire_game', 'game', v_game.id,
      jsonb_build_object('stake', v_game.stake, 'reason', 'timeout', 'timeout_minutes', p_timeout_minutes));

    -- Remove players e a mesa
    DELETE FROM public.game_players WHERE game_id = v_game.id;
    DELETE FROM public.games WHERE id = v_game.id;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired', v_expired_count);
END;
$$;

-- Permite que o lobby (usuario autenticado) chame o reforco best-effort
GRANT EXECUTE ON FUNCTION public.expire_stale_games(INTEGER) TO authenticated;

-- ============================================
-- Agendamento via pg_cron (roda a cada minuto)
-- Requer a extensao pg_cron habilitada no projeto Supabase.
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Remove um agendamento anterior com o mesmo nome (idempotente em re-runs)
DO $$
BEGIN
  PERFORM cron.unschedule('expire-stale-games');
EXCEPTION WHEN OTHERS THEN
  -- ignora se o job ainda nao existe
  NULL;
END;
$$;

SELECT cron.schedule(
  'expire-stale-games',
  '* * * * *',                                  -- a cada minuto
  $$ SELECT public.expire_stale_games(10); $$   -- timeout de 10 minutos
);
