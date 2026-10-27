-- Separate the intentionally public directory from the private profile records.
-- Keep the view API and its three columns unchanged for lobby, chat and blog.
-- Admin predicates must not execute for anonymous public readers. This also
-- prevents a private is_admin helper from breaking otherwise public blog reads.
do $$ declare pol record; begin
  for pol in select schemaname,tablename,policyname from pg_policies
    where schemaname in ('public','storage') and lower(policyname) like '%admin%'
      and (coalesce(qual,'')||coalesce(with_check,'')) like '%is_admin%'
      and ('public'=any(roles) or 'anon'=any(roles))
  loop
    execute format('alter policy %I on %I.%I to authenticated',pol.policyname,pol.schemaname,pol.tablename);
  end loop;
end $$;

create table public.profile_cards (
  id uuid primary key references public.profiles(id) on delete cascade,
  username text,
  avatar_url text
);
alter table public.profile_cards enable row level security;
revoke all on public.profile_cards from public,anon,authenticated;
grant select on public.profile_cards to anon,authenticated;
grant all on public.profile_cards to service_role;
create policy profile_cards_members_read on public.profile_cards for select to authenticated using (true);
create policy profile_cards_published_authors_read on public.profile_cards for select to anon
  using (exists(select 1 from public.blog_posts b where b.author_id=profile_cards.id and b.is_published));
create policy profile_cards_service_manage on public.profile_cards for all to service_role using (true) with check (true);

create function private.sync_profile_card() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profile_cards(id,username,avatar_url) values(new.id,new.username,new.avatar_url)
  on conflict(id) do update set username=excluded.username,avatar_url=excluded.avatar_url;
  return new;
end $$;
revoke all on function private.sync_profile_card() from public,anon,authenticated;
create trigger sync_profile_card after insert or update of username,avatar_url on public.profiles
  for each row execute function private.sync_profile_card();
insert into public.profile_cards(id,username,avatar_url) select id,username,avatar_url from public.profiles;

create or replace view public.public_profiles with (security_invoker=true,security_barrier=true) as
  select id,username,avatar_url from public.profile_cards;
create or replace view public.blog_authors with (security_invoker=true,security_barrier=true) as
  select p.id,p.username,p.avatar_url from public.profile_cards p
  where exists(select 1 from public.blog_posts b where b.author_id=p.id and b.is_published);
revoke all on public.public_profiles from public,anon,authenticated;
grant select on public.public_profiles to authenticated;
revoke all on public.blog_authors from public,anon,authenticated;
grant select on public.blog_authors to anon,authenticated;
comment on table public.profile_cards is 'Public presentation only: id, nickname, avatar. No email, legal name, birth date, role or identity document. Synchronized from private profiles by an internal trigger.';

-- Make the intended server-only access to internal state explicit.
do $$ declare name text; begin
  foreach name in array array['app_config','commission_effects','community_receipts','game_effects','identity_extraction_limits','welcome_credits'] loop
    if to_regclass('private.'||name) is not null then
      execute format('revoke all on private.%I from public,anon,authenticated',name);
      execute format('grant all on private.%I to service_role',name);
      execute format('create policy server_only on private.%I for all to service_role using (true) with check (true)',name);
    end if;
  end loop;
end $$;

-- Public counters are invoked only by bounded server actions, never directly
-- by anonymous clients. Service role already has table privileges, so invoker
-- functions suffice and no SECURITY DEFINER boundary is needed here.
create or replace function public.increment_blog_views(p_post_id uuid) returns void
language sql security invoker set search_path = '' as $$
  update public.blog_posts set views=coalesce(views,0)+1 where id=p_post_id and is_published
$$;
create or replace function public.track_affiliate_click(p_code text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare link public.affiliate_links;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9_-]{1,64}$' then return jsonb_build_object('success',false); end if;
  update public.affiliate_links set clicks=coalesce(clicks,0)+1 where code=lower(p_code) returning * into link;
  if link.id is null then return jsonb_build_object('success',false); end if;
  return jsonb_build_object('success',true);
end $$;
revoke all on function public.increment_blog_views(uuid),public.track_affiliate_click(text) from public,anon,authenticated;
grant execute on function public.increment_blog_views(uuid),public.track_affiliate_click(text) to service_role;
grant select,update on public.blog_posts,public.affiliate_links to service_role;

-- Reviewed, deliberately authenticated RPCs. Explicit grants do not rely on
-- PostgreSQL's default PUBLIC execute permission. Authorization stays inside
-- each function and its internal engine; do not change them to invoker blindly.
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.prosecdef and p.proname=any(array[
      'admin_apply_bonus','append_support_message','create_support_ticket','get_table_state','identity_credit_status',
      'is_admin','is_game_participant','is_game_waiting','pay_affiliate','process_cancel_game','process_create_game',
      'process_deposit','process_join_game','process_leave_game','process_play_card','process_turn_timeout',
      'process_withdrawal','record_banner_click','redeem_promo_code','register_affiliate_referral','resolve_support_ticket',
      'send_game_message','set_support_ticket_status','touch_last_seen','update_affiliate_status_admin','write_community_knowledge'])
  loop
    execute format('revoke all on function %s from public,anon',f.signature);
    execute format('grant execute on function %s to authenticated,service_role',f.signature);
  end loop;
end $$;
