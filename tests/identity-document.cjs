const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { PGlite } = require('@electric-sql/pglite');
let client, service, model, checks = 0;
const check = (ok, message) => { assert.ok(ok, message); checks++; };
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const box = { exports: {}, URL, Response, File, FormData, Blob, Intl, Date, Uint8Array, crypto,
    location: { origin: 'https://clubedasueca.co.mz' },
    createImageBitmap: async () => ({ width: 1000, height: 600, close() {} }),
    document: { createElement: () => ({ getContext: () => ({ fillRect() {}, drawImage() {}, getImageData: () => ({}) }), toBlob: callback => callback(new Blob([new Uint8Array(120)], { type: 'image/jpeg' })) }) },
    process: { env: {} }, require(name) {
    if (name === '@/lib/extract-identity-document') return {extractIdentityDocument: async () => { if (extractionError) throw new Error(extractionError); return extracted; }};
    if (name === '@/lib/identity-document' || name === './identity-document') return model;
    if (name === '@/lib/supabase/server') return { createClient: async () => client };
    if (name === '@/lib/admin-mfa') return { hasAdminMfa: async () => false };
    if (name === '@/lib/supabase/service') return { createServiceClient: () => service };
    throw new Error('Unexpected import: ' + name);
  } };
  vm.runInNewContext(source, box); return box.exports;
}
model = load('src/lib/identity-document.ts');
let extracted, extractionError;
const route = load('src/app/api/profile/identity/route.ts');
const uid = n => `10000000-0000-0000-0000-${String(n).padStart(12, '0')}`;
const valid = { full_name: 'UTILIZADOR DE TESTE', document_number: 'TESTE00001', birth_date: '1990-01-01', expiry_date: '2099-12-31', country: 'MOZ', document_type: 'id', photo_present: true };
function fixture({ anonymous = false, guest = false, banned = false, admin = false, previous = null, uploadFail = -1, writeFail = false } = {}) {
  const calls = []; let uploads = 0; extracted = valid; extractionError = '';
  client = { auth: { getUser: async () => ({ data: { user: anonymous ? null : { id: uid(1), is_anonymous: guest } } }) }, from(table) {
    return { select: () => ({ eq: () => ({ single: async () => ({ data: { role: admin ? 'admin' : 'user', is_banned: banned, full_name: valid.full_name } }), maybeSingle: async () => ({ data: table === 'profile_identity_documents' ? previous : null }) }) }) };
  } };
  service = { rpc: async () => ({data:true,error:null}), storage: { from: () => ({
    upload: async (path) => { calls.push(['upload', path]); return { error: uploads++ === uploadFail ? {} : null }; },
    remove: async paths => { calls.push(['remove', paths]); return { error: null }; },
    createSignedUrl: async path => { calls.push(['sign', path]); return { data: { signedUrl: 'https://example.invalid/' + path } }; },
  }) }, from() {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: previous, error: null }) };
    const write = row => { calls.push(['write', row]); const result = { eq: () => result, select: () => result, maybeSingle: async () => ({ data: writeFail ? null : row, error: writeFail ? { code: '23505' } : null }) }; return result; };
    return { ...query, insert: write, update: write };
  } };
  return calls;
}
function request({ fields = valid, consent = model.BI_CONSENT_VERSION, origin = 'https://clubedasueca.co.mz', revision = '', corrupt = false } = {}) {
  const form = new FormData();
  const jpeg = new Uint8Array(120); if (!corrupt) jpeg.set([255, 216, 255]);
  form.set('front', new File([jpeg], 'front.jpg', { type: 'image/jpeg' }));
  form.set('back', new File([jpeg], 'back.jpg', { type: 'image/jpeg' }));
  form.set('fields', JSON.stringify(fields)); form.set('consent', consent); if (revision) form.set('revision', revision);
  return { url: 'https://clubedasueca.co.mz/api/profile/identity', headers: new Headers({ origin }), formData: async () => form };
}
async function main() {
  check(model.identityNamesMatch('João da Silva Santos', 'Santos João Silva'), 'name accents order and connectors tolerated');
  check(!model.identityNamesMatch('João da Silva Santos', 'João Silva'), 'missing surname rejected');
  check(model.isAdult('2008-10-13','2026-10-13') && !model.isAdult('2008-10-14','2026-10-13'), 'exact eighteenth birthday');
  for (const type of ['id','passport','citizen_card','residence_permit']) check(model.validateIdentityFields({...valid, country:'PRT',document_type:type}).document_type===type,'international document type accepted');
  for (const date of ['2026-02-30', '2026-13-01', '2026-00-20', '', '2026-1-1']) check(!model.isCalendarDate(date), 'strict date rejects ' + date);
  check(model.isCalendarDate('2024-02-29'), 'leap date accepted');
  check(model.mozambiqueToday(new Date('2026-10-12T22:01:00Z')) === '2026-10-13', 'Maputo midnight boundary');
  check(model.validateIdentityFields({ ...valid, expiry_date: '2026-10-13' }, '2026-10-13').expiry_date === '2026-10-13', 'expiry day inclusive');
  for (const bad of [{ expiry_date: '2026-10-12' }, { expiry_date: '' }, { birth_date: '2026-10-14' }, { country: 'PT' }, { document_type: 'driving_license' }, { photo_present: false }, { birth_date: '2010-01-01' }, { full_name: '<script>' }, { document_number: '' }]) {
    assert.throws(() => model.validateIdentityFields({ ...valid, ...bad }, '2026-10-13')); checks++;
  }
  for (const options of [{ anonymous: true }, { guest: true }, { banned: true }]) {
    const calls = fixture(options); check((await route.POST(request())).status === 401, 'unauthorized write denied'); check(calls.length === 0, 'no storage side effects');
  }
  for (const options of [{ origin: 'https://attacker.invalid' }, { consent: '' }, { corrupt: true }]) {
    const calls = fixture(); check((await route.POST(request(options))).status >= 400, 'invalid write denied'); check(calls.length === 0, 'invalid request has no storage side effects');
  }
  let calls = fixture(); check((await route.GET({ url: `https://clubedasueca.co.mz/api/profile/identity?userId=${uid(2)}` })).status === 403, 'IDOR denied'); check(calls.length === 0, 'IDOR cannot sign images');
  calls = fixture(); check((await route.POST(request())).status === 200, 'valid BI saved'); check(calls.filter(c => c[0] === 'upload').length === 2, 'two attachments');
  const written = calls.find(c => c[0] === 'write')[1]; check(written.source === 'gemini_server_extraction', 'server extraction provenance');
  calls = fixture(); extracted = {...valid, expiry_date:'2000-01-01'}; check((await route.POST(request())).status === 422 && !calls.some(c=>c[0]==='upload'), 'expired extracted document never uploaded');
  calls = fixture(); extracted = {...valid, full_name:'OUTRA PESSOA'}; check((await route.POST(request())).status === 422 && !calls.some(c=>c[0]==='upload'), 'name mismatch never uploaded');
  calls = fixture(); extracted = {...valid, birth_date:'2010-01-01'}; check((await route.POST(request())).status === 422 && !calls.some(c=>c[0]==='upload'), 'minor never uploaded');
  calls = fixture(); extractionError = 'Provider unavailable'; check((await route.POST(request())).status === 422 && !calls.some(c=>c[0]==='upload'), 'AI failure never uploads or saves');
  calls = fixture(); service.rpc = async()=>({data:false,error:null}); check((await route.POST(request())).status === 429 && !calls.some(c=>c[0]==='upload'), 'rate limit denies extraction');
  calls = fixture(); check((await route.POST(request({fields:{...valid, document_number:'FORGED999'}}))).status===200 && calls.find(c=>c[0]==='write')[1].document_number===valid.document_number, 'client supplied fields ignored'); check(written.user_id === uid(1) && written.authenticity_verified === false, 'server derives owner and never approves authenticity');
  const previous = { revision: crypto.randomUUID(), front_path: 'old/front.jpg', back_path: 'old/back.jpg' };
  calls = fixture({ previous }); check((await route.POST(request())).status === 409 && calls.length === 0, 'stale replacement denied before upload');
  calls = fixture({ previous }); check((await route.POST(request({ revision: previous.revision }))).status === 200, 'replacement saved'); check(calls.at(-1)[0] === 'remove' && calls.at(-1)[1][0] === previous.front_path, 'previous images removed after write');
  calls = fixture({ uploadFail: 1 }); check((await route.POST(request())).status === 503, 'second upload failure'); check(!calls.some(c => c[0] === 'write') && calls.at(-1)[0] === 'remove', 'first upload cleaned up');
  calls = fixture({ writeFail: true }); check((await route.POST(request())).status === 409 && calls.at(-1)[0] === 'remove', 'write conflict cleans new uploads');

  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage;
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
    create function public.is_admin() returns boolean language sql stable as $$select auth.uid()='${uid(3)}'::uuid$$;
    grant usage on schema public,auth,storage to anon,authenticated,service_role;
    create table public.profiles(id uuid primary key);
    insert into public.profiles values('${uid(1)}'),('${uid(2)}'),('${uid(3)}');
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);`);
  await db.exec(fs.readFileSync('supabase/migrations/20261013074321_profile_identity_documents.sql', 'utf8'));
  await db.exec(fs.readFileSync('supabase/migrations/20261013082110_gemini_identity_extraction.sql', 'utf8'));
  await db.exec(`insert into public.profile_identity_documents(user_id,full_name,document_number,birth_date,expiry_date,front_path,back_path,consent_version) values
    ('${uid(1)}','TEST ONE','TEST001','1990-01-01','2099-01-01','${uid(1)}/fixture/front.jpg','${uid(1)}/fixture/back.jpg','${model.BI_CONSENT_VERSION}'),
    ('${uid(2)}','TEST TWO','TEST002','1990-01-01','2099-01-01','${uid(2)}/fixture/front.jpg','${uid(2)}/fixture/back.jpg','${model.BI_CONSENT_VERSION}');`);
  const as = async (id, role = 'authenticated') => db.exec(`reset role; set role ${role}; select set_config('request.jwt.claim.sub','${id}',false);`);
  await as(uid(1)); check((await db.query('select * from public.profile_identity_documents')).rows.length === 1, 'owner RLS only own BI');
  let denied = false; try { await db.exec("update public.profile_identity_documents set authenticity_verified=true"); } catch { denied = true; } check(denied, 'client cannot change document records');
  await as(uid(3)); check((await db.query('select * from public.profile_identity_documents')).rows.length === 2, 'admin may read attachments record');
  await as('', 'anon'); denied = false; try { await db.query('select * from public.profile_identity_documents'); } catch { denied = true; } check(denied, 'anonymous cannot read BI');
  await db.exec('reset role'); check((await db.query("select public from storage.buckets where id='identity-documents'")).rows[0].public === false, 'private bucket');
  await as(uid(1)); denied=false; try { await db.query(`select public.claim_identity_extraction('${uid(1)}')`); } catch {denied=true;} check(denied,'client cannot reserve or reset AI quota');
  await as(uid(1),'service_role'); for(let i=0;i<6;i++) check((await db.query(`select public.claim_identity_extraction('${uid(1)}') as claimed`)).rows[0].claimed,'atomic quota reservation');
  check(!(await db.query(`select public.claim_identity_extraction('${uid(1)}') as claimed`)).rows[0].claimed,'seventh request blocked');
  await db.exec('reset role'); await db.exec(`update private.identity_extraction_limits set window_started=now()-interval '11 minutes'`);
  await as(uid(1),'service_role'); check((await db.query(`select public.claim_identity_extraction('${uid(1)}') as claimed`)).rows[0].claimed,'quota window reset');
  await creditChecks(db);
  await db.close();
  console.log(`PASS ${checks} BI date, mapping, API authorization, storage cleanup and PostgreSQL RLS checks. Mocked Storage; no personal BI used.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });

async function creditChecks(db) {
  await db.exec(`reset role;
    alter table public.profiles add column full_name text, add column is_banned boolean default false;
    create table public.wallets(id uuid primary key default gen_random_uuid(),user_id uuid,balance numeric default 0,updated_at timestamptz);
    create table public.transactions(id uuid default gen_random_uuid(),wallet_id uuid,amount numeric,type text,description text);
    create table public.audit_logs(user_id uuid,action text,entity_type text,entity_id uuid,details jsonb);
    create function private.require_player(id uuid) returns void language plpgsql as $$begin if id is distinct from auth.uid() then raise exception 'Forbidden'; end if; end$$;
    create function private.require_beta() returns void language sql as $$select$$;
    insert into public.wallets(user_id) values('${uid(1)}'),('${uid(2)}'),('${uid(3)}');
    update public.profiles set full_name='João da Silva Santos' where id='${uid(1)}';`);
  await db.exec(fs.readFileSync('supabase/migrations/20261013093827_document_credit_eligibility.sql','utf8'));
  const asUser = () => db.exec(`reset role; set role authenticated; select set_config('request.jwt.claim.sub','${uid(1)}',false);`);
  const noDeposit = async () => { let denied=false; try { await db.query(`select public.process_deposit('${uid(1)}',100)`); } catch(e) { denied=/IDENTITY_REQUIRED/.test(e.message); } check(denied,'direct RPC blocks ineligible document'); };
  await asUser(); await noDeposit(); // Legacy OCR has not checked the portrait.
  await db.exec(`reset role; update public.profile_identity_documents set full_name='Santos Joao Silva',photo_present=true where user_id='${uid(1)}'`);
  await asUser(); check((await db.query('select public.identity_credit_status() as error')).rows[0].error===null,'eligible document status');
  check((await db.query(`select public.process_deposit('${uid(1)}',100) as deposit`)).rows[0].deposit.new_balance===100,'valid document permits actual credit RPC');
  for (const assignment of ["expiry_date=current_date-1", "birth_date=current_date-interval '17 years'", "photo_present=false", "full_name='Outra Pessoa'"]) {
    await db.exec(`reset role; update public.profile_identity_documents set expiry_date='2099-01-01',birth_date='1990-01-01',photo_present=true,full_name='Santos Joao Silva' where user_id='${uid(1)}'; update public.profile_identity_documents set ${assignment} where user_id='${uid(1)}';`);
    await asUser(); await noDeposit();
  }
  await db.exec(`reset role; update public.profile_identity_documents set expiry_date=(now() at time zone 'Africa/Maputo')::date,birth_date=((now() at time zone 'Africa/Maputo')::date-interval '18 years')::date,photo_present=true,full_name='Santos Joao Silva',document_type='passport',country='PRT',back_path=null where user_id='${uid(1)}'`);
  await asUser(); check((await db.query('select public.identity_credit_status() as error')).rows[0].error===null,'passport, eighteenth birthday and expiry today accepted');
  await db.exec(`reset role; update public.profiles set full_name='Outra Pessoa' where id='${uid(1)}'`);
  await asUser(); await noDeposit();
  await db.exec(`reset role; delete from public.profile_identity_documents where user_id='${uid(1)}'`);
  await asUser(); await noDeposit();
  await db.exec('reset role'); check((await db.query(`select balance from public.wallets where user_id='${uid(1)}'`)).rows[0].balance==='100','blocked credits never changed balance');
}
