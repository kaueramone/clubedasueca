-- ============================================
-- Migration 081: Cancel Game Financial RPC
-- Operação atómica para cancelar um jogo e reembolsar
-- ============================================

CREATE OR REPLACE FUNCTION public.process_cancel_game(
  p_game_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game RECORD;
  v_player RECORD;
  v_wallet_id UUID;
BEGIN
  -- Lock game row
  SELECT * INTO v_game
  FROM public.games
  WHERE id = p_game_id
  FOR UPDATE;

  IF v_game IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_game.status != 'waiting' THEN
    RAISE EXCEPTION 'Apenas mesas na sala de espera podem ser canceladas';
  END IF;

  IF v_game.host_id != p_user_id THEN
    RAISE EXCEPTION 'Apenas o criador da mesa a pode cancelar';
  END IF;

  -- Refund all joined players
  FOR v_player IN
    SELECT user_id
    FROM public.game_players
    WHERE game_id = p_game_id
  LOOP
    SELECT id INTO v_wallet_id
    FROM public.wallets
    WHERE user_id = v_player.user_id
    FOR UPDATE;

    UPDATE public.wallets
    SET balance = balance + v_game.stake, updated_at = NOW()
    WHERE id = v_wallet_id;

    INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
    VALUES (v_wallet_id, v_game.stake, 'refund',
      format('Mesa Cancelada %s (Reembolso)', LEFT(p_game_id::text, 8)), p_game_id);
  END LOOP;

  -- Delete game (will likely cascade to game_players, but explicit is fine too)
  DELETE FROM public.game_players WHERE game_id = p_game_id;
  DELETE FROM public.games WHERE id = p_game_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'cancel_game', 'game', p_game_id,
    jsonb_build_object('stake_refunded', v_game.stake, 'reason', 'Cancelamento pelo host'));

  RETURN jsonb_build_object('success', true);
END;
$$;
