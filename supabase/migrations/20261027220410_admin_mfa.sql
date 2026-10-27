-- Administrative privileges always require a server-issued AAL2 token.
-- Enrollment/challenge remains available through Auth and /dashboard/security.
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path=pg_catalog,public as $$
  select coalesce(auth.jwt()->>'aal' = 'aal2',false)
    and exists(select 1 from public.profiles where id=auth.uid() and role='admin' and not coalesce(is_banned,false));
$$;
revoke all on function public.is_admin() from public,anon;
grant execute on function public.is_admin() to authenticated,service_role;
comment on function public.is_admin() is 'Administrative role, active account and verified MFA session (JWT AAL2). AAL1 admins retain only ordinary owner permissions until MFA verification.';
alter policy support_conversation_read on public.live_conversations
  using (user_id=auth.uid() or public.is_admin());


CREATE OR REPLACE FUNCTION public.set_support_ticket_status(p_conversation_id uuid, p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.live_conversations; next_status public.conversation_status; label text;
BEGIN
 IF NOT public.is_admin() THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF p_status IS NULL OR p_status NOT IN ('waiting_agent','active','resolved') THEN RAISE EXCEPTION 'Invalid status'; END IF;
 SELECT * INTO c FROM public.live_conversations WHERE id=p_conversation_id FOR UPDATE;
 IF c.id IS NULL THEN RAISE EXCEPTION 'Unknown ticket'; END IF;
 IF c.agent_id IS NOT NULL AND c.agent_id<>auth.uid() THEN RAISE EXCEPTION 'Ticket assigned to another agent'; END IF;
 next_status := p_status::public.conversation_status;
 IF c.status IS DISTINCT FROM next_status THEN
   UPDATE public.live_conversations SET status=next_status,
     agent_id=CASE WHEN next_status='active' THEN auth.uid() ELSE agent_id END,
     resolved_at=CASE WHEN next_status='resolved' THEN now() ELSE NULL END, updated_at=now()
   WHERE id=c.id RETURNING * INTO c;
   label := CASE next_status WHEN 'waiting_agent' THEN 'Em espera' WHEN 'active' THEN 'Em resolução' ELSE 'Resolvido' END;
   INSERT INTO public.live_messages(conversation_id,is_bot,message)
   VALUES(c.id,true,'Estado do pedido: '||label||'. Pode continuar a enviar mensagens.');
 END IF;
 RETURN jsonb_build_object('id',c.id,'status',c.status,'agent_id',c.agent_id,'resolved_at',c.resolved_at,'updated_at',c.updated_at);
END $$;

CREATE OR REPLACE FUNCTION public.append_support_message(p_conversation_id uuid,p_message text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.live_conversations; is_admin boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=auth.uid() AND NOT coalesce(is_banned,false)) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 PERFORM pg_advisory_xact_lock(hashtext(auth.uid()::text));
 SELECT public.is_admin() INTO is_admin;
 SELECT * INTO c FROM public.live_conversations WHERE id=p_conversation_id FOR UPDATE;
 IF c.id IS NULL OR (c.user_id<>auth.uid() AND NOT coalesce(is_admin,false)) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
 IF is_admin AND c.agent_id IS NOT NULL AND c.agent_id<>auth.uid() THEN RAISE EXCEPTION 'Ticket assigned to another agent'; END IF;
 IF p_message IS NULL OR length(trim(p_message)) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'Invalid message'; END IF;
 IF (SELECT count(*) FROM public.live_messages WHERE sender_id=auth.uid() AND created_at>now()-interval '1 minute')>=30 THEN RAISE EXCEPTION 'Message rate limit'; END IF;
 INSERT INTO public.live_messages(conversation_id,sender_id,is_bot,message) VALUES(c.id,auth.uid(),false,trim(p_message));
 UPDATE public.live_conversations SET updated_at=now(),
   agent_id=CASE WHEN is_admin THEN auth.uid() ELSE agent_id END,
   status=CASE WHEN is_admin THEN 'active'::public.conversation_status ELSE 'waiting_agent'::public.conversation_status END,
   resolved_at=NULL WHERE id=c.id;
END $$;

-- Compatibility with older deployed clients.
CREATE OR REPLACE FUNCTION public.resolve_support_ticket(p_conversation_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM public.set_support_ticket_status(p_conversation_id,'resolved');
END $$;

REVOKE ALL ON FUNCTION public.set_support_ticket_status(uuid,text),public.append_support_message(uuid,text),public.resolve_support_ticket(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_support_ticket_status(uuid,text),public.append_support_message(uuid,text),public.resolve_support_ticket(uuid) TO authenticated;

