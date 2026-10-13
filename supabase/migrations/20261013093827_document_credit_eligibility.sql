alter table public.profile_identity_documents drop constraint profile_identity_documents_country_check;
alter table public.profile_identity_documents add constraint profile_identity_documents_country_check check (country ~ '^[A-Z]{3}$' and country <> 'UNK');
alter table public.profile_identity_documents drop constraint profile_identity_documents_document_type_check;
alter table public.profile_identity_documents add constraint profile_identity_documents_document_type_check check (document_type in ('id','passport','citizen_card','residence_permit'));
alter table public.profile_identity_documents alter column back_path drop not null;
alter table public.profile_identity_documents add constraint identity_document_reverse_required check (document_type = 'passport' or back_path is not null);
-- Old OCR attachments remain private, but require a new extraction to check the portrait.
alter table public.profile_identity_documents add column photo_present boolean not null default false;

create function private.normalized_identity_name(p_name text) returns text
language sql immutable set search_path = '' as $$
  select coalesce(string_agg(word, ' ' order by word collate "C"), '')
  from regexp_split_to_table(regexp_replace(translate(lower(coalesce(p_name,'')),
    'áàâãäåéèêëíìîïóòôõöúùûüçñýÿ', 'aaaaaaeeeeiiiiooooouuuucnyy'), '[^a-z\s]', ' ', 'g'), '\s+') as word
  where word <> '' and word not in ('da','das','de','do','dos','e')
$$;
revoke all on function private.normalized_identity_name(text) from public,anon,authenticated;

create function private.identity_credit_error(p_user_id uuid) returns text
language plpgsql stable set search_path = '' as $$
declare doc public.profile_identity_documents; profile public.profiles; today date := (now() at time zone 'Africa/Maputo')::date; name text;
begin
  select * into profile from public.profiles where id=p_user_id;
  if profile.id is null or profile.is_banned then return 'Conta indisponível.'; end if;
  select * into doc from public.profile_identity_documents where user_id=p_user_id;
  if doc.user_id is null then return 'Valide um documento de identificação no Perfil antes de adicionar créditos.'; end if;
  if doc.source <> 'gemini_server_extraction' or not doc.photo_present then return 'Envie novamente o documento no Perfil para conferir fotografia, idade, validade e nome.'; end if;
  if doc.birth_date > (today - interval '18 years')::date then return 'É necessário ter pelo menos 18 anos, conforme o documento.'; end if;
  if doc.expiry_date < today then return 'Documento expirado. Envie o documento renovado no Perfil.'; end if;
  name := private.normalized_identity_name(doc.full_name);
  if position(' ' in name)=0 or name <> private.normalized_identity_name(profile.full_name) then return 'O nome no documento deve corresponder ao Nome Completo do perfil.'; end if;
  return null;
end $$;
revoke all on function private.identity_credit_error(uuid) from public,anon,authenticated;

create function public.identity_credit_status() returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then return 'Inicie sessão para validar o documento.'; end if;
  return private.identity_credit_error(auth.uid());
end $$;
revoke all on function public.identity_credit_status() from public,anon;
grant execute on function public.identity_credit_status() to authenticated;

create or replace function public.process_deposit(p_user_id uuid,p_amount numeric) returns jsonb
language plpgsql security definer set search_path=pg_catalog,public as $$
declare w public.wallets; tx uuid; identity_error text;
begin
  perform private.require_player(p_user_id); perform private.require_beta();
  -- Prevent concurrent profile/document changes while authorising and posting credits.
  perform 1 from public.profiles where id=p_user_id for share;
  perform 1 from public.profile_identity_documents where user_id=p_user_id for share;
  identity_error := private.identity_credit_error(p_user_id);
  if identity_error is not null then raise exception 'IDENTITY_REQUIRED: %', identity_error; end if;
  if p_amount is null or p_amount::text in ('NaN','Infinity','-Infinity') or p_amount < 50 or p_amount > 10000 or p_amount <> trunc(p_amount) then
    raise exception 'Adicionar entre 50 e 10.000 créditos inteiros de teste';
  end if;
  select * into w from public.wallets where user_id=p_user_id for update;
  if w.id is null or w.balance+p_amount>100000 then raise exception 'Limite de créditos de teste atingido'; end if;
  update public.wallets set balance=balance+p_amount,updated_at=now() where id=w.id;
  insert into public.transactions(wallet_id,amount,type,description) values(w.id,p_amount,'deposit','Créditos fictícios de teste — sem cobrança') returning id into tx;
  insert into public.audit_logs(user_id,action,entity_type,entity_id,details) values(p_user_id,'test_credit','wallet',w.id,jsonb_build_object('amount',p_amount,'tx_id',tx));
  return jsonb_build_object('success',true,'new_balance',w.balance+p_amount,'tx_id',tx);
end $$;
revoke all on function public.process_deposit(uuid,numeric) from public,anon;
grant execute on function public.process_deposit(uuid,numeric) to authenticated;
