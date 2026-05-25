-- ============================================
-- Migration 097: Expiração de mesas por dono inativo
-- Em vez de expirar só por idade da mesa, cancela mesas 'waiting' cujo
-- DONO (host) não dá sinal de vida (heartbeat) há mais de N minutos.
-- ============================================

-- 1. Heartbeat persistido do utilizador (presença realtime é só em memória)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- RPC leve para o client "tocar" o heartbeat periodicamente
CREATE OR REPLACE FUNCTION public.touch_last_seen()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET last_seen_at = NOW()
  WHERE id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.touch_last_seen() TO authenticated;

-- ============================================
-- 2. Expira mesas 'waiting' cujo dono está inativo há > p_minutes.
--    Regra:
--      - dono com last_seen_at há mais de p_minutes  -> expira; OU
--      - dono sem last_seen_at (nunca registou heartbeat) E mesa criada
--        há mais de p_minutes -> expira (cobre mesas antigas, ex: a do Tilts).
--    Reembolsa todos os jogadores e apaga a mesa.
-- ============================================
CREATE OR REPLACE FUNCTION public.expire_owner_inactive_games(
  p_minutes INTEGER DEFAULT 3
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
  v_cutoff TIMESTAMPTZ := NOW() - (p_minutes || ' minutes')::INTERVAL;
BEGIN
  FOR v_game IN
    SELECT g.id, g.stake
    FROM public.games g
    JOIN public.profiles p ON p.id = g.host_id
    WHERE g.status = 'waiting'
      AND (
        (p.last_seen_at IS NOT NULL AND p.last_seen_at < v_cutoff)
        OR (p.last_seen_at IS NULL AND g.created_at < v_cutoff)
      )
    FOR UPDATE OF g SKIP LOCKED
  LOOP
    -- Reembolsa cada jogador na mesa
    FOR v_player IN
      SELECT user_id FROM public.game_players WHERE game_id = v_game.id
    LOOP
      SELECT id INTO v_wallet_id
      FROM public.wallets WHERE user_id = v_player.user_id FOR UPDATE;

      IF v_wallet_id IS NOT NULL THEN
        UPDATE public.wallets
        SET balance = balance + v_game.stake, updated_at = NOW()
        WHERE id = v_wallet_id;

        INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
        VALUES (v_wallet_id, v_game.stake, 'refund',
          format('Mesa encerrada (dono inativo) %s', LEFT(v_game.id::text, 8)), v_game.id);
      END IF;
    END LOOP;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (NULL, 'expire_game', 'game', v_game.id,
      jsonb_build_object('stake', v_game.stake, 'reason', 'owner_inactive', 'minutes', p_minutes));

    DELETE FROM public.game_players WHERE game_id = v_game.id;
    DELETE FROM public.games WHERE id = v_game.id;

    v_expired_count := v_expired_count + 1;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'expired', v_expired_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.expire_owner_inactive_games(INTEGER) TO authenticated;

-- ============================================
-- 3. Repontar o cron de expiração para a nova regra (dono inativo, 3 min).
--    Mantém também a expiração por idade (095) como rede de segurança.
-- ============================================
DO $$
BEGIN
  PERFORM cron.unschedule('expire-owner-inactive');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

SELECT cron.schedule(
  'expire-owner-inactive',
  '* * * * *',
  $$ SELECT public.expire_owner_inactive_games(3); $$
);
