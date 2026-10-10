BEGIN;
-- Fisher-Yates with cryptographic bytes and rejection sampling (no modulo bias).
-- No seeds supplied by clients, clocks or account balances. Fail closed on RNG errors.
CREATE FUNCTION private.secure_sueca_deck() RETURNS text[]
LANGUAGE plpgsql VOLATILE SET search_path=pg_catalog AS $$
DECLARE deck text[]; i integer; j integer; sample integer; cutoff integer; swap text;
BEGIN
 SELECT array_agg(s||'-'||r ORDER BY si,ri) INTO deck
 FROM unnest(ARRAY['hearts','diamonds','clubs','spades']) WITH ORDINALITY AS suits(s,si)
 CROSS JOIN unnest(ARRAY['2','3','4','5','6','Q','J','K','7','A']) WITH ORDINALITY AS ranks(r,ri);
 FOR i IN REVERSE 40..2 LOOP
   cutoff := 256 - (256 % i);
   LOOP
     sample := get_byte(extensions.gen_random_bytes(1),0);
     EXIT WHEN sample < cutoff;
   END LOOP;
   j := (sample % i)+1;
   swap := deck[i]; deck[i] := deck[j]; deck[j] := swap;
 END LOOP;
 RETURN deck;
END $$;
REVOKE ALL ON FUNCTION private.secure_sueca_deck() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.deal_cards_for_game(p_game_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE deck text[]; players uuid[]; i integer; g public.games;
BEGIN
  SELECT * INTO g FROM public.games WHERE id=p_game_id FOR UPDATE;
  IF g.id IS NULL OR g.status<>'playing' OR g.trump_suit IS NOT NULL OR EXISTS(SELECT 1 FROM public.game_moves WHERE game_id=p_game_id)
    OR EXISTS(SELECT 1 FROM public.game_players WHERE game_id=p_game_id AND coalesce(jsonb_array_length(hand),0)>0) THEN
    RAISE EXCEPTION 'Distribuição já efetuada ou estado inválido';
  END IF;
  SELECT array_agg(id ORDER BY position) INTO players FROM public.game_players WHERE game_id=p_game_id;
  IF array_length(players,1) IS DISTINCT FROM 4 THEN RAISE EXCEPTION 'São necessários quatro jogadores'; END IF;
  deck := private.secure_sueca_deck();
  FOR i IN 0..3 LOOP
    UPDATE public.game_players SET hand=to_jsonb(deck[(i*10+1):(i*10+10)]) WHERE id=players[i+1];
  END LOOP;
  UPDATE public.games SET trump_suit=public.card_suit(deck[10]),trump_card=deck[10],current_turn=1,current_trick=1,current_round=1,score_a=0,score_b=0,turn_started_at=clock_timestamp() WHERE id=p_game_id;
END $$;
-- Preserve internal-only dealing; CREATE OR REPLACE retains existing grants.
REVOKE ALL ON FUNCTION public.deal_cards_for_game(uuid) FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.card_suit(text) SET search_path=pg_catalog,public;
ALTER FUNCTION public.card_rank(text) SET search_path=pg_catalog,public;
ALTER FUNCTION public.card_value(text) SET search_path=pg_catalog,public;
ALTER FUNCTION public.card_strength(text) SET search_path=pg_catalog,public;
COMMIT;
