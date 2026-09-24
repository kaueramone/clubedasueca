-- Independent review fixes. Apply after 106 and 107.
BEGIN;
-- Keep all original row/bucket conditions and additionally require an active admin.
-- Covers optional storage policies when installed, without requiring storage locally.
DO $$ DECLARE p record; clause text; BEGIN
 FOR p IN SELECT * FROM pg_policies WHERE schemaname IN ('public','storage')
 AND lower(policyname) LIKE '%admin%' LOOP
   clause := '';
   IF p.qual IS NOT NULL THEN clause := clause || format(' USING ((%s) AND public.is_admin())',p.qual); END IF;
   IF p.with_check IS NOT NULL THEN clause := clause || format(' WITH CHECK ((%s) AND public.is_admin())',p.with_check); END IF;
   IF clause<>'' THEN EXECUTE format('ALTER POLICY %I ON %I.%I%s',p.policyname,p.schemaname,p.tablename,clause); END IF;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION private.process_game_end(
  p_game_id UUID,
  p_score_a INTEGER,
  p_score_b INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=pg_catalog,public
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
  -- Round each equal winner payout once; the house receives the exact residual.
  -- This conserves the pot even when the stake has cents (e.g. 50.01).
  v_prize_per_player := round(v_total_pot * 0.80 / 2, 2);
  v_house_fee := v_total_pot - 2 * v_prize_per_player;
  -- comissão EFECTIVAMENTE retida: zero em caso de empate
  v_fee_charged := CASE WHEN v_winner_team != 'Draw' THEN v_house_fee ELSE 0 END;

  IF v_winner_team != 'Draw' THEN


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

-- No direct click log writes or counter rewrites from browsers.
DROP POLICY IF EXISTS "System can insert banner clicks" ON public.banner_clicks;
REVOKE INSERT,UPDATE,DELETE ON public.banner_clicks FROM anon,authenticated;
CREATE OR REPLACE FUNCTION public.record_banner_click(p_banner_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM private.require_player(auth.uid());
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 IF (SELECT count(*) FROM public.banner_clicks WHERE user_id=auth.uid() AND clicked_at>now()-interval '1 minute')>=30 THEN RETURN false; END IF;
 UPDATE public.banners SET clicks=coalesce(clicks,0)+1
 WHERE id=p_banner_id AND is_active AND (start_date IS NULL OR start_date<=now()) AND (end_date IS NULL OR end_date>now());
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.banner_clicks(banner_id,user_id) VALUES(p_banner_id,auth.uid());
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_banner_click(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.record_banner_click(uuid) TO authenticated;
REVOKE ALL ON FUNCTION private.process_game_end(uuid,integer,integer) FROM PUBLIC,anon,authenticated;
COMMIT;
