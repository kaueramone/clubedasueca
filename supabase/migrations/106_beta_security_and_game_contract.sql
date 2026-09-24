-- Forward-only hardening. Apply after 105 in staging first; no balances are reset.
BEGIN;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
CREATE TABLE private.app_config (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  mode text NOT NULL DEFAULT 'beta' CHECK (mode IN ('beta', 'paused'))
);
INSERT INTO private.app_config DEFAULT VALUES;

CREATE FUNCTION private.require_beta() RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF (SELECT mode FROM private.app_config WHERE singleton) IS DISTINCT FROM 'beta' THEN
    RAISE EXCEPTION 'Créditos de teste indisponíveis';
  END IF;
END $$;

CREATE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND NOT coalesce(is_banned,false));
$$;

CREATE FUNCTION private.require_player(p_uid uuid, p_eligible boolean DEFAULT true) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF auth.uid() IS NULL OR p_uid IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Não autorizado' USING ERRCODE = '42501';
  END IF;
  IF p_eligible AND NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_uid AND NOT coalesce(is_banned,false)
    AND birth_date IS NOT NULL AND birth_date <= (current_date - interval '18 years')::date
  ) THEN RAISE EXCEPTION 'Conta não elegível: confirma a maioridade ou contacta o apoio' USING ERRCODE = '42501'; END IF;
END $$;

-- Keep private data in the existing table for compatibility. Only the directory view is public.
CREATE VIEW public.public_profiles WITH (security_barrier=true) AS
  SELECT id, username, avatar_url FROM public.profiles;
REVOKE ALL ON public.public_profiles FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.public_profiles TO authenticated;
CREATE VIEW public.blog_authors WITH (security_barrier=true) AS
  SELECT p.id,p.username,p.avatar_url FROM public.profiles p
  WHERE EXISTS (SELECT 1 FROM public.blog_posts b WHERE b.author_id=p.id AND b.is_published);
REVOKE ALL ON public.blog_authors FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.blog_authors TO anon,authenticated;
DO $$ DECLARE p record; BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='profiles' LOOP
    EXECUTE format('DROP POLICY %I ON public.profiles',p.policyname);
  END LOOP;
END $$;
CREATE POLICY profiles_private_read ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid() OR public.is_admin());
CREATE POLICY profiles_own_edit ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid() OR public.is_admin()) WITH CHECK (id=auth.uid() OR public.is_admin());
REVOKE INSERT, DELETE ON public.profiles FROM anon, authenticated;
CREATE FUNCTION private.protect_profile() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  -- Invoker trigger: a SECURITY DEFINER system RPC runs as the owner; raw REST writes don't.
  IF current_user IN ('anon','authenticated') AND NOT public.is_admin() THEN
    IF (to_jsonb(NEW) - ARRAY['username','avatar_url','full_name','nationality','session_id','updated_at'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['username','avatar_url','full_name','nationality','session_id','updated_at']) THEN
      RAISE EXCEPTION 'Campos protegidos: contacte o apoio' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER protect_profile BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.protect_profile();

-- Financial rows are never written directly by a client, including administrators.
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['wallets','transactions','withdrawals','house_revenue','user_metrics','email_logs','audit_logs'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
    END LOOP;
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  END LOOP;
END $$;
CREATE POLICY wallets_read ON public.wallets FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY transactions_read ON public.transactions FOR SELECT TO authenticated USING(public.is_admin() OR wallet_id IN (SELECT id FROM public.wallets WHERE user_id=auth.uid()));
CREATE POLICY withdrawals_read ON public.withdrawals FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY house_read ON public.house_revenue FOR SELECT TO authenticated USING(public.is_admin());
CREATE POLICY metrics_read ON public.user_metrics FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY email_read ON public.email_logs FOR SELECT TO authenticated USING(user_id=auth.uid() OR public.is_admin());
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated USING(public.is_admin());

DROP POLICY IF EXISTS "System can insert user bonuses" ON public.user_bonuses;
DROP POLICY IF EXISTS "System can update user bonuses" ON public.user_bonuses;
DROP POLICY IF EXISTS "System can insert user VIP" ON public.user_vip;
DROP POLICY IF EXISTS "System can update user VIP" ON public.user_vip;
DROP POLICY IF EXISTS "System can insert referrals" ON public.affiliate_referrals;
DROP POLICY IF EXISTS "System can update referrals" ON public.affiliate_referrals;
DROP POLICY IF EXISTS "System can insert commissions" ON public.affiliate_commissions;
DROP POLICY IF EXISTS "Users can insert own affiliate" ON public.affiliates;
CREATE POLICY affiliate_application ON public.affiliates FOR INSERT TO authenticated WITH CHECK (
  user_id=auth.uid() AND status='pending' AND commission_model='revenue_share' AND revenue_share_pct=25
  AND cpa_amount IS NULL AND total_earned=0 AND total_paid=0
);

-- Explicit test-ledger labelling. This deployment cannot switch to real money with a flag.
ALTER TABLE public.wallets ADD COLUMN ledger_mode text NOT NULL DEFAULT 'beta' CHECK (ledger_mode='beta');
ALTER TABLE public.transactions ADD COLUMN ledger_mode text NOT NULL DEFAULT 'beta' CHECK (ledger_mode='beta');
ALTER TABLE public.withdrawals ADD COLUMN ledger_mode text NOT NULL DEFAULT 'beta' CHECK (ledger_mode='beta');
ALTER TABLE public.games ADD COLUMN ledger_mode text NOT NULL DEFAULT 'beta' CHECK (ledger_mode='beta');
ALTER TABLE public.games ADD COLUMN trump_card text;

CREATE OR REPLACE FUNCTION public.process_deposit(p_user_id uuid,p_amount numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE w public.wallets; tx uuid;
BEGIN
  PERFORM private.require_player(p_user_id); PERFORM private.require_beta();
  IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount < 50 OR p_amount > 10000 OR p_amount <> round(p_amount,2) THEN
    RAISE EXCEPTION 'Adicionar entre 50 e 10.000 créditos de teste';
  END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id=p_user_id FOR UPDATE;
  IF w.id IS NULL OR w.balance+p_amount>100000 THEN RAISE EXCEPTION 'Limite de créditos de teste atingido'; END IF;
  UPDATE public.wallets SET balance=balance+p_amount,updated_at=now() WHERE id=w.id;
  INSERT INTO public.transactions(wallet_id,amount,type,description) VALUES(w.id,p_amount,'deposit','Créditos fictícios de teste — sem cobrança') RETURNING id INTO tx;
  INSERT INTO public.audit_logs(user_id,action,entity_type,entity_id,details) VALUES(p_user_id,'test_credit','wallet',w.id,jsonb_build_object('amount',p_amount,'tx_id',tx));
  RETURN jsonb_build_object('success',true,'new_balance',w.balance+p_amount,'tx_id',tx);
END $$;
CREATE OR REPLACE FUNCTION public.process_withdrawal(p_user_id uuid,p_amount numeric,p_pix_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_user_id);
  RAISE EXCEPTION 'No beta não existem levantamentos. Os créditos são fictícios e serão repostos a zero no lançamento.';
END $$;

-- Isolate existing engines. Internal functions cannot be called through PostgREST.
ALTER FUNCTION public.process_create_game(uuid,numeric) SET SCHEMA private;
ALTER FUNCTION public.process_join_game(uuid,uuid,text) SET SCHEMA private;
DROP FUNCTION IF EXISTS public.process_join_game(uuid,uuid);
ALTER FUNCTION public.process_leave_game(uuid,uuid) SET SCHEMA private;
ALTER FUNCTION public.process_cancel_game(uuid,uuid) SET SCHEMA private;
ALTER FUNCTION public.process_play_card(uuid,text,uuid) SET SCHEMA private;
ALTER FUNCTION public.process_game_end(uuid,integer,integer) SET SCHEMA private;

CREATE FUNCTION public.process_create_game(p_user_id uuid,p_stake numeric) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_user_id); PERFORM private.require_beta();
  IF p_stake IS NULL OR p_stake::text IN ('NaN','Infinity','-Infinity') OR p_stake<=0 OR p_stake>10000 OR p_stake<>round(p_stake,2) THEN RAISE EXCEPTION 'Entrada inválida'; END IF;
  RETURN private.process_create_game(p_user_id,p_stake);
END $$;
CREATE FUNCTION public.process_join_game(p_user_id uuid,p_game_id uuid,p_preferred_team text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_user_id); PERFORM private.require_beta();
  IF p_preferred_team IS NOT NULL AND p_preferred_team NOT IN ('A','B') THEN RAISE EXCEPTION 'Equipa inválida'; END IF;
  RETURN private.process_join_game(p_user_id,p_game_id,p_preferred_team);
END $$;
CREATE FUNCTION public.process_leave_game(p_user_id uuid,p_game_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_user_id,false);
  RETURN private.process_leave_game(p_user_id,p_game_id);
END $$;
CREATE FUNCTION public.process_cancel_game(p_user_id uuid,p_game_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_user_id,false);
  RETURN private.process_cancel_game(p_user_id,p_game_id);
END $$;
CREATE FUNCTION public.process_play_card(p_game_id uuid,p_card text,p_acting_user_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_acting_user_id);
  RETURN private.process_play_card(p_game_id,p_card,auth.uid());
END $$;

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
  SELECT array_agg(s||'-'||r ORDER BY random()) INTO deck
    FROM unnest(ARRAY['hearts','diamonds','clubs','spades']) s
    CROSS JOIN unnest(ARRAY['2','3','4','5','6','Q','J','K','7','A']) r;
  FOR i IN 0..3 LOOP
    UPDATE public.game_players SET hand=to_jsonb(deck[(i*10+1):(i*10+10)]) WHERE id=players[i+1];
  END LOOP;
  UPDATE public.games SET trump_suit=public.card_suit(deck[10]),trump_card=deck[10],current_turn=1,current_trick=1,current_round=1,score_a=0,score_b=0,turn_started_at=clock_timestamp() WHERE id=p_game_id;
END $$;

CREATE FUNCTION public.process_turn_timeout(p_game_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE g public.games; p public.game_players; lead text; card text;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN
    PERFORM private.require_player(auth.uid());
    IF NOT public.is_game_participant(p_game_id,auth.uid()) THEN RAISE EXCEPTION 'Não autorizado' USING ERRCODE='42501'; END IF;
  END IF;
  SELECT * INTO g FROM public.games WHERE id=p_game_id FOR UPDATE;
  IF g.id IS NULL OR g.status<>'playing' THEN RETURN jsonb_build_object('error','Jogo inativo'); END IF;
  IF g.turn_started_at IS NULL OR g.turn_started_at+interval '30 seconds'>clock_timestamp() THEN
    RETURN jsonb_build_object('error','O turno ainda não terminou');
  END IF;
  SELECT * INTO p FROM public.game_players WHERE game_id=p_game_id AND position=g.current_turn;
  SELECT public.card_suit(m.card) INTO lead FROM public.game_moves m WHERE game_id=p_game_id AND round_number=g.current_round AND trick_number=g.current_trick ORDER BY played_at LIMIT 1;
  SELECT c INTO card FROM jsonb_array_elements_text(p.hand) c
    ORDER BY CASE WHEN public.card_suit(c)=lead THEN 0 ELSE 1 END, public.card_value(c),c LIMIT 1;
  IF card IS NULL THEN RETURN jsonb_build_object('error','Sem cartas'); END IF;
  RETURN private.process_play_card(p_game_id,card,p.user_id);
END $$;

-- Settlement and all derived accounting share the engine's transaction. A retry cannot settle twice.
CREATE TABLE private.game_effects (game_id uuid PRIMARY KEY REFERENCES public.games(id), processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE private.commission_effects (game_id uuid PRIMARY KEY REFERENCES public.games(id));
ALTER FUNCTION public.process_affiliate_commission(uuid,numeric) SET SCHEMA private;
CREATE FUNCTION public.process_affiliate_commission(p_game_id uuid,p_house_fee numeric) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE fee numeric;
BEGIN
  PERFORM 1 FROM public.games WHERE id=p_game_id AND status='finished' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Partida não terminada'; END IF;
  INSERT INTO private.commission_effects(game_id) VALUES(p_game_id) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  SELECT coalesce(sum(amount),0) INTO fee FROM public.house_revenue WHERE game_id=p_game_id;
  IF fee>0 THEN PERFORM private.process_affiliate_commission(p_game_id,fee); END IF;
END $$;
CREATE FUNCTION public.process_game_end(p_game_id uuid,p_score_a integer,p_score_b integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; p record; g public.games; fee numeric;
BEGIN
  SELECT * INTO g FROM public.games WHERE id=p_game_id FOR UPDATE;
  IF g.status='finished' THEN RETURN jsonb_build_object('success',true,'already_finished',true); END IF;
  IF p_score_a IS NULL OR p_score_b IS NULL OR p_score_a<0 OR p_score_b<0 OR p_score_a+p_score_b<>120
     OR (SELECT count(*) FROM public.game_moves WHERE game_id=p_game_id)<>40 THEN RAISE EXCEPTION 'Resultado incompleto'; END IF;
  result:=private.process_game_end(p_game_id,p_score_a,p_score_b);
  INSERT INTO private.game_effects(game_id) VALUES(p_game_id);
  FOR p IN SELECT user_id,team FROM public.game_players WHERE game_id=p_game_id ORDER BY user_id LOOP
    PERFORM public.update_bonus_wagered(p.user_id,g.stake);
    PERFORM public.add_vip_points(p.user_id,floor(g.stake)::integer);
    PERFORM public.increment_user_metrics(p.user_id,0,0,g.stake,
      CASE WHEN result->>'winner_team'=p.team THEN (result->>'prize_per_player')::numeric ELSE 0 END,
      1,CASE WHEN result->>'winner_team'=p.team THEN 1 ELSE 0 END);
  END LOOP;
  SELECT coalesce(sum(amount),0) INTO fee FROM public.house_revenue WHERE game_id=p_game_id;
  PERFORM public.process_affiliate_commission(p_game_id,fee);
  RETURN result;
END $$;

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
  RETURN jsonb_build_object('game',to_jsonb(g)||jsonb_build_object('turn_deadline',g.turn_started_at+interval '30 seconds','current_trick_cards',cards),'players',players);
END $$;

-- Atomic and idempotent initial credit, even with mandatory email confirmation.
CREATE TABLE private.welcome_credits (user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION private.credit_activated_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE wid uuid;
BEGIN
  IF NEW.email_confirmed_at IS NULL OR (SELECT mode FROM private.app_config WHERE singleton)<>'beta' THEN RETURN NEW; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE id=NEW.id AND NOT coalesce(is_banned,false) AND birth_date<=(current_date-interval '18 years')::date) THEN RETURN NEW; END IF;
  INSERT INTO private.welcome_credits(user_id) VALUES(NEW.id) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN NEW; END IF;
  SELECT id INTO wid FROM public.wallets WHERE user_id=NEW.id FOR UPDATE;
  IF wid IS NULL THEN RAISE EXCEPTION 'Carteira não encontrada'; END IF;
  UPDATE public.wallets SET balance=balance+100,updated_at=now() WHERE id=wid;
  INSERT INTO public.transactions(wallet_id,amount,type,description,reference_id) VALUES(wid,100,'bonus','Boas-vindas: 100 créditos fictícios de teste',NEW.id);
  RETURN NEW;
END $$;
-- AFTER INSERT trigger runs after on_auth_user_created (alphabetical trigger order).
CREATE TRIGGER zz_beta_welcome AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users FOR EACH ROW EXECUTE FUNCTION private.credit_activated_user();

-- Direct Auth API registrations must meet the same age policy as the form.
CREATE FUNCTION private.validate_registration() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE dob date;
BEGIN
  BEGIN dob:=(NEW.raw_user_meta_data->>'birth_date')::date; EXCEPTION WHEN OTHERS THEN RAISE EXCEPTION 'Data de nascimento inválida'; END;
  IF dob IS NULL OR dob>current_date-interval '18 years' OR dob<current_date-interval '120 years' THEN RAISE EXCEPTION 'Registo reservado a maiores de 18 anos'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_beta_registration BEFORE INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION private.validate_registration();

-- Allowlisted wrappers below are the only client-executable privileged mutators.
ALTER FUNCTION public.redeem_promo_code(uuid,text) SET SCHEMA private;
CREATE FUNCTION public.redeem_promo_code(p_user_id uuid,p_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_user_id); PERFORM private.require_beta();
  PERFORM 1 FROM public.promo_codes WHERE code=upper(trim(p_code)) FOR UPDATE;
  RETURN private.redeem_promo_code(p_user_id,p_code);
END $$;
-- apply_bonus is internal; explicit admin entry point retains the manual award workflow.
CREATE FUNCTION public.admin_apply_bonus(p_user_id uuid,p_bonus_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado' USING ERRCODE='42501'; END IF;
  PERFORM private.require_beta();
  PERFORM 1 FROM public.bonuses WHERE id=p_bonus_id FOR UPDATE;
  RETURN public.apply_bonus(p_user_id,p_bonus_id,0);
END $$;
ALTER FUNCTION public.register_affiliate_referral(uuid,text) SET SCHEMA private;
CREATE FUNCTION public.register_affiliate_referral(p_referred_user_id uuid,p_ref_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  PERFORM private.require_player(p_referred_user_id); PERFORM private.require_beta();
  PERFORM 1 FROM public.profiles WHERE id=p_referred_user_id FOR UPDATE;
  RETURN private.register_affiliate_referral(p_referred_user_id,p_ref_code);
END $$;
ALTER FUNCTION public.update_affiliate_status_admin(uuid,text,uuid) SET SCHEMA private;
CREATE FUNCTION public.update_affiliate_status_admin(p_affiliate_id uuid,p_status text,p_admin_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF p_admin_id IS DISTINCT FROM auth.uid() OR NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado' USING ERRCODE='42501'; END IF;
  RETURN private.update_affiliate_status_admin(p_affiliate_id,p_status,auth.uid());
END $$;
CREATE OR REPLACE FUNCTION public.pay_affiliate(p_affiliate_id uuid,p_amount numeric,p_admin_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
  IF p_admin_id IS DISTINCT FROM auth.uid() OR NOT public.is_admin() THEN RAISE EXCEPTION 'Não autorizado' USING ERRCODE='42501'; END IF;
  RAISE EXCEPTION 'Pagamentos de afiliados indisponíveis durante o beta';
END $$;

-- Durable webhook receipt prevents replay and limits model requests per sender.
CREATE TABLE private.community_receipts(message_id uuid PRIMARY KEY REFERENCES public.global_messages(id) ON DELETE CASCADE,user_id uuid NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE FUNCTION public.claim_community_message(p_message_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE m public.global_messages;
BEGIN
  SELECT * INTO m FROM public.global_messages WHERE id=p_message_id;
  IF m.id IS NULL OR length(m.content)>2000 THEN RETURN NULL; END IF;
  PERFORM 1 FROM public.profiles WHERE id=m.user_id AND NOT coalesce(is_banned,false) FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF (SELECT count(*) FROM private.community_receipts WHERE user_id=m.user_id AND created_at>now()-interval '1 minute')>=3 THEN RETURN NULL; END IF;
  INSERT INTO private.community_receipts(message_id,user_id) VALUES(m.id,m.user_id) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN NULL; END IF;
  RETURN jsonb_build_object('message',m.content,'user_id',m.user_id);
END $$;

-- Default deny all existing definer functions, pin their namespace, then grant audited entry points.
DO $$ DECLARE f record; BEGIN
  FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('public','private') AND p.prosecdef LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated',f.signature);
    EXECUTE format('ALTER FUNCTION %s SET search_path=pg_catalog,public',f.signature);
  END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(),public.is_game_participant(uuid,uuid),public.is_game_waiting(uuid),public.get_table_state(uuid),public.touch_last_seen(),
  public.process_create_game(uuid,numeric),public.process_join_game(uuid,uuid,text),public.process_leave_game(uuid,uuid),public.process_cancel_game(uuid,uuid),
  public.process_play_card(uuid,text,uuid),public.process_turn_timeout(uuid),public.process_deposit(uuid,numeric),public.process_withdrawal(uuid,numeric,text),
  public.redeem_promo_code(uuid,text),public.admin_apply_bonus(uuid,uuid),public.register_affiliate_referral(uuid,text),public.update_affiliate_status_admin(uuid,text,uuid),public.pay_affiliate(uuid,numeric,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_affiliate_click(text),public.increment_blog_views(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.process_turn_timeout(uuid),public.claim_community_message(uuid) TO service_role;
COMMIT;
