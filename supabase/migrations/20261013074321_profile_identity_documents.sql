-- BI records are attachments to profiles, not identity-verification approvals.
create table public.profile_identity_documents (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  revision uuid not null default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 200),
  document_number text not null check (char_length(document_number) between 5 and 40),
  birth_date date not null,
  expiry_date date not null check (expiry_date > birth_date),
  country text not null default 'MOZ' check (country = 'MOZ'),
  document_type text not null default 'id' check (document_type = 'id'),
  source text not null default 'blinkid_client_ocr' check (source = 'blinkid_client_ocr'),
  authenticity_verified boolean not null default false check (authenticity_verified = false),
  front_path text not null check (front_path like user_id::text || '/%/front.jpg'),
  back_path text not null check (back_path like user_id::text || '/%/back.jpg'),
  consent_version text not null check (consent_version = 'bi-storage-2026-10-13'),
  submitted_at timestamptz not null default now()
);
alter table public.profile_identity_documents enable row level security;
revoke all on public.profile_identity_documents from public, anon, authenticated;
grant select on public.profile_identity_documents to authenticated;
grant all on public.profile_identity_documents to service_role;
create policy identity_documents_private_read on public.profile_identity_documents
  for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 2097152, array['image/jpeg']);
-- No client policies: server-authenticated uploads and short-lived signed reads only.
