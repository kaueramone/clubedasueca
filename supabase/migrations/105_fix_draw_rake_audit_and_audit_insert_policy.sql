-- ============================================
-- Migration 105: duas correcções de integridade identificadas em auditoria
--
-- BUG A (registo de comissão em empates)
--   process_game_end calculava v_house_fee ANTES do IF e gravava-o no
--   audit_log incondicionalmente, incluindo no ramo do empate — onde nada é
--   retido e não há INSERT em house_revenue. O trilho de auditoria de uma
--   mesa empatada afirmava que tinham sido retidos 20% do pote.
--   Correcção: gravar house_fee=0 e rake_pct=0 quando o resultado é empate.
--
-- BUG B (política de inserção no trilho de auditoria)
--   A política "System can insert audit logs" era FOR INSERT TO public
--   WITH CHECK (true) — qualquer utilizador (incluindo anon) podia injectar
--   registos arbitrários na tabela de auditoria, forjando entradas em nome
--   de terceiros.
--   Correcção: só authenticated pode inserir, e apenas registos atribuídos a
--   si próprio. As RPCs SECURITY DEFINER (owner=postgres, sem FORCE RLS) e a
--   service role continuam a escrever normalmente, por contornarem RLS.
--   Verificado antes de aplicar: audit_logs.relowner=postgres,
--   relforcerowsecurity=false, e todas as process_* são prosecdef=true.
--
-- Nota de código: src/features/game/actions.ts passa a escrever o audit de
-- fim de jogo com a service role (svc) em vez do cliente de sessão, para que
-- o watchdog — que joga por um jogador AFK sem sessão — continue a registar.
-- ============================================

CREATE OR REPLACE FUNCTION public.process_game_end(
  p_game_id UUID,
  p_score_a INTEGER,
  p_score_b INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
DECLARE
  v_stake DECIMAL;
  v_winner_team TEXT;
  v_total_pot DECIMAL;
  v_house_fee DECIMAL;
  v_fee_charged DECIMAL;
  v_prize_per_player DECIMAL;
  v_player RECORD;
  v_wallet_id UUID;
BEGIN
  SELECT stake INTO v_stake
  FROM public.games
  WHERE id = p_game_id AND status = 'playing'
  FOR UPDATE;

  IF v_stake IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado ou não está ativo';
  END IF;

  IF p_score_a > 60 THEN
    v_winner_team := 'A';
  ELSIF p_score_b > 60 THEN
    v_winner_team := 'B';
  ELSE
    v_winner_team := 'Draw';
  END IF;

  UPDATE public.games
  SET status = 'finished',
      score_a = p_score_a,
      score_b = p_score_b,
      winner_team = v_winner_team,
      updated_at = NOW()
  WHERE id = p_game_id;

  v_total_pot := v_stake * 4;
  v_house_fee := v_total_pot * 0.20;
  -- comissão EFECTIVAMENTE retida: zero em caso de empate
  v_fee_charged := CASE WHEN v_winner_team != 'Draw' THEN v_house_fee ELSE 0 END;

  IF v_winner_team != 'Draw' THEN
    v_prize_per_player := (v_total_pot - v_house_fee) / 2;

    FOR v_player IN
      SELECT gp.user_id
      FROM public.game_players gp
      WHERE gp.game_id = p_game_id AND gp.team = v_winner_team
    LOOP
      SELECT id INTO v_wallet_id
      FROM public.wallets
      WHERE user_id = v_player.user_id
      FOR UPDATE;

      UPDATE public.wallets
      SET balance = balance + v_prize_per_player, updated_at = NOW()
      WHERE id = v_wallet_id;

      INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
      VALUES (v_wallet_id, v_prize_per_player, 'win',
        format('Vitória na mesa %s', LEFT(p_game_id::text, 8)), p_game_id);
    END LOOP;

    INSERT INTO public.house_revenue (game_id, amount)
    VALUES (p_game_id, v_house_fee);

  ELSE
    FOR v_player IN
      SELECT gp.user_id
      FROM public.game_players gp
      WHERE gp.game_id = p_game_id
    LOOP
      SELECT id INTO v_wallet_id
      FROM public.wallets
      WHERE user_id = v_player.user_id
      FOR UPDATE;

      UPDATE public.wallets
      SET balance = balance + v_stake, updated_at = NOW()
      WHERE id = v_wallet_id;

      INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
      VALUES (v_wallet_id, v_stake, 'refund',
        format('Empate na mesa %s', LEFT(p_game_id::text, 8)), p_game_id);
    END LOOP;
  END IF;

  -- O trilho passa a reflectir a comissão EFECTIVAMENTE retida.
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'game_end', 'game', p_game_id,
    jsonb_build_object('score_a', p_score_a, 'score_b', p_score_b,
      'winner_team', v_winner_team, 'total_pot', v_total_pot,
      'house_fee', v_fee_charged,
      'rake_pct', CASE WHEN v_winner_team != 'Draw' THEN 20 ELSE 0 END));

  RETURN jsonb_build_object(
    'success', true,
    'winner_team', v_winner_team,
    'score_a', p_score_a,
    'score_b', p_score_b,
    'prize_per_player', CASE WHEN v_winner_team != 'Draw' THEN v_prize_per_player ELSE v_stake END
  );
END;
$fn$;

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

CREATE POLICY audit_logs_insert_own ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
