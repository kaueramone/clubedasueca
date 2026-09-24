-- Support history is append-only for users and administrators; trusted routines own transitions.
BEGIN;
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' AND tablename IN ('live_conversations','live_messages','support_tickets','support_messages') LOOP
 EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,p.tablename);
 END LOOP;
END $$;
ALTER TABLE public.live_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.live_conversations, public.live_messages FROM anon, authenticated;
GRANT SELECT ON public.live_conversations, public.live_messages TO authenticated;
CREATE POLICY support_conversation_read ON public.live_conversations FOR SELECT TO authenticated
 USING (user_id=auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND NOT coalesce(is_banned,false)));
CREATE POLICY support_message_read ON public.live_messages FOR SELECT TO authenticated
 USING (EXISTS (SELECT 1 FROM public.live_conversations c WHERE c.id=conversation_id));

CREATE OR REPLACE FUNCTION public.create_support_ticket(p_subject text,p_message text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ticket uuid; BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT coalesce(is_banned,false)) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF length(trim(p_subject)) NOT BETWEEN 1 AND 150 OR length(trim(p_message)) NOT BETWEEN 1 AND 4000 OR p_subject IS NULL OR p_message IS NULL THEN RAISE EXCEPTION 'Invalid message'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 IF (SELECT count(*) FROM public.live_conversations WHERE user_id=auth.uid() AND created_at>now()-interval '1 hour') >=10 THEN RAISE EXCEPTION 'Ticket rate limit'; END IF;
 INSERT INTO public.live_conversations(user_id,subject,status) VALUES(auth.uid(),trim(p_subject),'waiting_agent') RETURNING id INTO ticket;
 INSERT INTO public.live_messages(conversation_id,sender_id,is_bot,message) VALUES(ticket,auth.uid(),false,trim(p_message));
 RETURN ticket;
END $$;
CREATE OR REPLACE FUNCTION public.append_support_message(p_conversation_id uuid,p_message text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.live_conversations; is_admin boolean; BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT coalesce(is_banned,false)) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 SELECT role='admin' INTO is_admin FROM public.profiles WHERE id=auth.uid();
 SELECT * INTO c FROM public.live_conversations WHERE id=p_conversation_id FOR UPDATE;
 IF c.id IS NULL OR (c.user_id<>auth.uid() AND NOT coalesce(is_admin,false)) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF is_admin AND c.agent_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Assign ticket before replying'; END IF;
 IF p_message IS NULL OR length(trim(p_message)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
 IF (SELECT count(*) FROM public.live_messages WHERE sender_id=auth.uid() AND created_at>now()-interval '1 minute')>=30 THEN RAISE EXCEPTION 'Message rate limit'; END IF;
 INSERT INTO public.live_messages(conversation_id,sender_id,is_bot,message) VALUES(c.id,auth.uid(),false,trim(p_message));
 UPDATE public.live_conversations SET updated_at=now(), status=CASE WHEN is_admin THEN 'active'::public.conversation_status ELSE 'waiting_agent'::public.conversation_status END, resolved_at=NULL WHERE id=c.id;
END $$;
CREATE OR REPLACE FUNCTION public.resolve_support_ticket(p_conversation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND role='admin' AND NOT coalesce(is_banned,false)) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 UPDATE public.live_conversations SET status='resolved',resolved_at=now(),updated_at=now() WHERE id=p_conversation_id AND status IN ('open','waiting_agent','active') AND (agent_id IS NULL OR agent_id=auth.uid());
 IF NOT FOUND THEN RAISE EXCEPTION 'Unknown ticket'; END IF;
 INSERT INTO public.live_messages(conversation_id,is_bot,message) VALUES(p_conversation_id,true,'Pedido marcado como resolvido pela equipa. Pode enviar uma nova mensagem para pedir revisão.');
END $$;
REVOKE ALL ON FUNCTION public.create_support_ticket(text,text), public.append_support_message(uuid,text), public.resolve_support_ticket(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text,text), public.append_support_message(uuid,text), public.resolve_support_ticket(uuid) TO authenticated;
-- Retain old support records, but expose no write interface for the retired tables.
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.support_tickets, public.support_messages FROM anon, authenticated;
GRANT SELECT ON public.support_tickets, public.support_messages TO authenticated;
CREATE POLICY legacy_support_read ON public.support_tickets FOR SELECT TO authenticated USING (user_id=auth.uid() OR public.is_admin());
CREATE POLICY legacy_support_message_read ON public.support_messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id=ticket_id));
COMMIT;
