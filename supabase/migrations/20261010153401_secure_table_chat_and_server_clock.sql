BEGIN;
-- Durable, attributable chat. Clients cannot choose author, timestamp or sender label.
CREATE TABLE public.game_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 game_id uuid NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
 author_id uuid NOT NULL REFERENCES public.profiles(id),
 request_id uuid NOT NULL,
 sender text NOT NULL,
 text text NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500 AND btrim(text) <> ''),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(game_id,author_id,request_id)
);
CREATE INDEX game_messages_history ON public.game_messages(game_id,created_at DESC,id);
CREATE INDEX game_messages_rate ON public.game_messages(author_id,created_at DESC);
ALTER TABLE public.game_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.game_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.game_messages TO authenticated;
CREATE POLICY participant_chat_history ON public.game_messages FOR SELECT TO authenticated
 USING (public.is_game_participant(game_id,(select auth.uid())) AND EXISTS
 (SELECT 1 FROM public.profiles WHERE id=(select auth.uid()) AND NOT coalesce(is_banned,false)));

CREATE FUNCTION public.send_game_message(p_game_id uuid,p_text text,p_request_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE uid uuid := auth.uid(); label text; existing uuid; sent uuid; last_at timestamptz; recent integer;
BEGIN
 PERFORM private.require_player(uid);
 IF NOT public.is_game_participant(p_game_id,uid) THEN
   RAISE EXCEPTION 'Apenas participantes podem conversar nesta mesa' USING ERRCODE='42501';
 END IF;
 IF p_request_id IS NULL OR p_text IS NULL OR char_length(btrim(p_text)) NOT BETWEEN 1 AND 500 THEN
   RAISE EXCEPTION 'Escreve entre 1 e 500 caracteres';
 END IF;
 -- Serialize sends per account, including across tables, to prevent concurrent rate-limit bypass.
 SELECT username INTO label FROM public.profiles WHERE id=uid FOR UPDATE;
 SELECT id INTO existing FROM public.game_messages
   WHERE game_id=p_game_id AND author_id=uid AND request_id=p_request_id;
 IF existing IS NOT NULL THEN RETURN existing; END IF;
 SELECT max(created_at),count(*) INTO last_at,recent FROM public.game_messages
   WHERE author_id=uid AND created_at>clock_timestamp()-interval '1 minute';
 IF last_at>clock_timestamp()-interval '2 seconds' OR recent>=20 THEN
   RAISE EXCEPTION 'Aguarda um pouco antes de enviar outra mensagem' USING ERRCODE='P0001';
 END IF;
 INSERT INTO public.game_messages(game_id,author_id,request_id,sender,text)
 VALUES(p_game_id,uid,p_request_id,coalesce(label,'Jogador'),btrim(p_text)) RETURNING id INTO sent;
 RETURN sent;
END $$;
REVOKE ALL ON FUNCTION public.send_game_message(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.send_game_message(uuid,text,uuid) TO authenticated;
-- Realtime is only a hint. The UI always fetches the authorized persisted history.
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_messages;

CREATE OR REPLACE FUNCTION public.get_table_state(p_game_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE g public.games; players jsonb; cards jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado' USING ERRCODE='42501'; END IF;
  -- SHARE lock gives one consistent game/hand/moves snapshot against the playing transaction.
  SELECT * INTO g FROM public.games WHERE id=p_game_id FOR SHARE;
  IF g.id IS NULL THEN RAISE EXCEPTION 'Mesa já não existe' USING ERRCODE='P0002'; END IF;
  IF g.status<>'waiting' AND NOT public.is_game_participant(p_game_id,auth.uid()) THEN
    RAISE EXCEPTION 'Acesso à mesa recusado' USING ERRCODE='42501';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',gp.id,'game_id',gp.game_id,'user_id',gp.user_id,'position',gp.position,'team',gp.team,
    'hand_count',coalesce(jsonb_array_length(gp.hand),0),'card_count',coalesce(jsonb_array_length(gp.hand),0),
    'hand',CASE WHEN gp.user_id=auth.uid() THEN coalesce(gp.hand,'[]'::jsonb) ELSE '[]'::jsonb END,
    'profiles',jsonb_build_object('username',pr.username,'avatar_url',pr.avatar_url)) ORDER BY gp.position),'[]'::jsonb)
    INTO players FROM public.game_players gp JOIN public.profiles pr ON pr.id=gp.user_id WHERE gp.game_id=p_game_id;
  SELECT coalesce(jsonb_agg(jsonb_build_object('player_id',m.player_id,'card',m.card,'position',gp.position) ORDER BY m.played_at),'[]'::jsonb)
    INTO cards FROM public.game_moves m JOIN public.game_players gp ON gp.game_id=m.game_id AND gp.user_id=m.player_id
    WHERE m.game_id=p_game_id AND m.round_number=g.current_round AND m.trick_number=g.current_trick;
  RETURN jsonb_build_object('game',to_jsonb(g)||jsonb_build_object('server_now',clock_timestamp(),'turn_deadline',g.turn_started_at+interval '30 seconds','current_trick_cards',cards),'players',players);
END $$;
COMMIT;
