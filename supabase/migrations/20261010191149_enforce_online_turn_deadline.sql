BEGIN;

-- Serialize the deadline check with both the rule engine and the timeout worker.
-- A disconnected client must not gain extra thinking time between watchdog runs.
CREATE OR REPLACE FUNCTION public.process_play_card(
  p_game_id uuid, p_card text, p_acting_user_id uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE g public.games;
BEGIN
  PERFORM private.require_player(p_acting_user_id);
  SELECT * INTO g FROM public.games WHERE id=p_game_id FOR UPDATE;
  IF g.status='playing' AND (g.turn_started_at IS NULL
     OR g.turn_started_at+interval '30 seconds'<=clock_timestamp()) THEN
    RETURN jsonb_build_object('error','Tempo esgotado. Aguarda a jogada automática.');
  END IF;
  RETURN private.process_play_card(p_game_id,p_card,auth.uid());
END $$;

COMMIT;
