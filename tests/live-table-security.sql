-- Authorized QA accounts only. All writes revert, including ledger entries and ban flags.
BEGIN;
DO $$
DECLARE
 qa_users uuid[] := ARRAY['79777c41-a722-4490-aa5f-dba4bf70f735','376be861-7ad9-4ea8-b737-76d3bf936231','fd65ba73-840a-4fb0-9c4f-2408eadf381d','0d77cd95-7617-4dbf-a0d6-440d7a2f079e']::uuid[];
 g uuid; result jsonb; snap jsonb; msg uuid; n integer; cards integer; points integer; blocked boolean;
BEGIN
 IF (SELECT count(*) FROM auth.users WHERE id=ANY(qa_users) AND raw_user_meta_data->>'qa_run'='qa-mobile-20261010-1791643457318')<>4 THEN
   RAISE EXCEPTION 'QA fixture does not match'; END IF;
 UPDATE public.profiles SET is_banned=false WHERE id=ANY(qa_users);
 FOR n IN 1..4 LOOP
   EXECUTE 'SET LOCAL ROLE authenticated';
   PERFORM set_config('request.jwt.claim.sub',qa_users[n]::text,true);
   PERFORM set_config('request.jwt.claim.role','authenticated',true);
   PERFORM public.process_deposit(qa_users[n],100);
   IF n=1 THEN
     result:=public.process_create_game(qa_users[n],50); g:=(result->>'game_id')::uuid;
   ELSE PERFORM public.process_join_game(qa_users[n],g,NULL); END IF;
   EXECUTE 'RESET ROLE';
 END LOOP;
 EXECUTE 'SET LOCAL ROLE authenticated';
 PERFORM set_config('request.jwt.claim.sub',qa_users[1]::text,true);
 snap:=public.get_table_state(g);
 IF snap->'game'->>'server_now' IS NULL OR (snap->'game'->>'turn_deadline')::timestamptz-(snap->'game'->>'server_now')::timestamptz>interval '30 seconds' THEN RAISE EXCEPTION 'Invalid clock sample'; END IF;
 msg:=public.send_game_message(g,'QA: identidade verificada',gen_random_uuid());
 IF (SELECT author_id FROM public.game_messages WHERE id=msg)<>qa_users[1] THEN RAISE EXCEPTION 'Forged author'; END IF;
 blocked:=false;
 BEGIN
   INSERT INTO public.game_messages(game_id,author_id,request_id,sender,text) VALUES(g,qa_users[2],gen_random_uuid(),'Administrador','forjada');
 EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Direct forged insert accepted'; END IF;
 blocked:=false;
 BEGIN PERFORM public.send_game_message(g,'spam',gen_random_uuid()); EXCEPTION WHEN raise_exception THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Flood accepted'; END IF;
 PERFORM set_config('request.jwt.claim.sub',qa_users[2]::text,true);
 IF (SELECT count(*) FROM public.game_messages WHERE id=msg)<>1 THEN RAISE EXCEPTION 'Participant history missing'; END IF;
 EXECUTE 'RESET ROLE';
 UPDATE public.profiles SET is_banned=true WHERE id=qa_users[2];
 EXECUTE 'SET LOCAL ROLE authenticated';
 IF EXISTS(SELECT 1 FROM public.game_messages WHERE id=msg) THEN RAISE EXCEPTION 'Banned participant read'; END IF;
 blocked:=false;
 BEGIN PERFORM public.send_game_message(g,'bloqueado',gen_random_uuid()); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Banned participant sent'; END IF;
 EXECUTE 'RESET ROLE';
 UPDATE public.profiles SET is_banned=false WHERE id=qa_users[2];
 EXECUTE 'SET LOCAL ROLE anon';
 PERFORM set_config('request.jwt.claim.sub','',true);
 blocked:=false;
 BEGIN PERFORM public.send_game_message(g,'anónimo',gen_random_uuid()); EXCEPTION WHEN insufficient_privilege THEN blocked:=true; END;
 IF NOT blocked THEN RAISE EXCEPTION 'Anonymous sent'; END IF;
 EXECUTE 'RESET ROLE';
 FOR n IN 1..40 LOOP
   UPDATE public.games SET turn_started_at=clock_timestamp()-interval '31 seconds' WHERE id=g;
   EXECUTE 'SET LOCAL ROLE authenticated';
   PERFORM set_config('request.jwt.claim.sub',qa_users[1]::text,true);
   result:=public.process_turn_timeout(g);
   IF result ? 'error' THEN RAISE EXCEPTION 'Move % failed: %',n,result; END IF;
   EXECUTE 'RESET ROLE';
 END LOOP;
 SELECT count(*),count(DISTINCT card) INTO n,cards FROM public.game_moves WHERE game_id=g;
 SELECT score_a+score_b INTO points FROM public.games WHERE id=g AND status='finished';
 IF n<>40 OR cards<>40 OR points<>120 THEN RAISE EXCEPTION 'Game conservation failed'; END IF;
 PERFORM set_config('qa.result',jsonb_build_object('status','PASS','moves',n,'distinct_cards',cards,'points',points,
   'chat','server identity, persisted delivery, direct forgery, flood, banned and anonymous controls passed',
   'clock','database server_now and 30 second deadline verified','writes','transaction rolled back')::text,true);
END $$;
SELECT current_setting('qa.result')::jsonb AS verification;
ROLLBACK;
