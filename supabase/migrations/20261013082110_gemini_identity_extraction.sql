alter table public.profile_identity_documents drop constraint profile_identity_documents_source_check;
alter table public.profile_identity_documents add constraint profile_identity_documents_source_check
  check (source in ('blinkid_client_ocr','gemini_server_extraction'));
alter table public.profile_identity_documents alter column source set default 'gemini_server_extraction';
alter table public.profile_identity_documents drop constraint profile_identity_documents_consent_version_check;
alter table public.profile_identity_documents add constraint profile_identity_documents_consent_version_check
  check (consent_version in ('bi-storage-2026-10-13','bi-storage-gemini-2026-10-13'));

create schema if not exists private;
create table private.identity_extraction_limits (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  window_started timestamptz not null default now(),
  attempts integer not null default 1 check (attempts between 1 and 6)
);
alter table private.identity_extraction_limits enable row level security;
revoke all on private.identity_extraction_limits from public,anon,authenticated;
grant usage on schema private to service_role;
grant all on private.identity_extraction_limits to service_role;
create function public.claim_identity_extraction(p_user_id uuid) returns boolean
  language sql security invoker set search_path = '' as $$
  with claimed as (
    insert into private.identity_extraction_limits as limits (user_id) values (p_user_id)
    on conflict (user_id) do update set
      window_started = case when limits.window_started < now()-interval '10 minutes' then now() else limits.window_started end,
      attempts = case when limits.window_started < now()-interval '10 minutes' then 1 else limits.attempts+1 end
    where limits.window_started < now()-interval '10 minutes' or limits.attempts < 6
    returning 1
  ) select exists(select 1 from claimed)
$$;
revoke all on function public.claim_identity_extraction(uuid) from public,anon,authenticated;
grant execute on function public.claim_identity_extraction(uuid) to service_role;
