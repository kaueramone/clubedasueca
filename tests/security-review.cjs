// Exercises the new boundary on the real migration chain used by test:db.
// All records below exist only in the isolated PGlite database.
const fs = require('node:fs');
const path = require('node:path');
module.exports = async function securityReview({db,check,deny,asUser,owner,uid,root}) {
  await owner();
  const privateTables=['app_config','commission_effects','community_receipts','game_effects','identity_extraction_limits','welcome_credits'];
  for(const name of privateTables) await db.exec(`create table if not exists private.${name}(fixture integer); alter table private.${name} enable row level security;`);
  const migration=fs.readdirSync(path.join(root,'supabase/migrations')).find(n=>n.endsWith('_security_review.sql'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',migration),'utf8'));
  const q=sql=>db.query(sql);
  check((await q("select reloptions from pg_class where oid='public.public_profiles'::regclass")).rows[0].reloptions.includes('security_invoker=true'),'directory view uses invoker security');
  check((await q("select reloptions from pg_class where oid='public.blog_authors'::regclass")).rows[0].reloptions.includes('security_invoker=true'),'blog view uses invoker security');
  const members=(await q('select count(*) n from profiles')).rows[0].n;
  check((await q('select count(*) n from profile_cards')).rows[0].n===members,'all public profile cards backfilled');
  await db.exec(`insert into blog_posts(id,slug,title,content,author_id,is_published,views) values
    ('${uid(70)}','qa-published','Published','Test','${uid(1)}',true,0),
    ('${uid(71)}','qa-draft','Draft','Test','${uid(2)}',false,0);`);
  await asUser(null,'anon');
  await deny('select * from public_profiles','anonymous cannot enumerate member directory');
  check((await q(`select * from blog_authors where id='${uid(1)}'`)).rows.length===1,'anonymous sees published author');
  check((await q(`select * from blog_authors where id='${uid(2)}'`)).rows.length===0,'draft author not disclosed');
  check((await q(`select * from profile_cards where id='${uid(2)}'`)).rows.length===0,'direct card REST access still hides unpublished author');
  await deny('select email from blog_authors','public blog view has no email field');
  check((await q('select email from profiles')).rows.length===0,'RLS hides all private profile rows from anonymous readers');
  await asUser(uid(1));
  check((await q('select * from public_profiles')).rows.length===Number(members),'authenticated directory preserves peers');
  check((await q('select * from profiles')).rows.length===1,'underlying private profiles remain owner-only');
  await deny('select full_name from public_profiles','directory has no legal name');
  await deny('select birth_date from profile_cards','directory table has no birth date');
  await deny(`update profile_cards set username='FORGED' where id='${uid(2)}'`,'user cannot edit a public card directly');
  await q(`update profiles set username='Updated fixture' where id='${uid(1)}'`);
  check((await q(`select username from public_profiles where id='${uid(1)}'`)).rows[0].username==='Updated fixture','profile edit synchronizes safe card');
  await owner();
  await db.exec(`insert into auth.users values ('${uid(50)}','directory-fixture@example.invalid','{"birth_date":"1990-01-01","full_name":"Directory Fixture"}',null)`);
  check((await q(`select * from profile_cards where id='${uid(50)}'`)).rows.length===1,'new registration synchronizes card');
  await q(`delete from auth.users where id='${uid(50)}'`);
  check((await q(`select * from profile_cards where id='${uid(50)}'`)).rows.length===0,'account deletion cascades safe card');
  for(const role of ['anon','authenticated']) {
    await asUser(role==='anon'?null:uid(1),role);
    await deny(`select increment_blog_views('${uid(70)}')`,'direct counter RPC denied for '+role);
    await deny("select track_affiliate_click('test-link')",'direct affiliate RPC denied for '+role);
    for(const name of privateTables) await deny(`select * from private.${name}`,'private state unreadable to '+role+': '+name);
  }
  await owner();
  for(const name of privateTables) check((await q(`select count(*) n from pg_policies where schemaname='private' and tablename='${name}' and policyname='server_only'`)).rows[0].n===1,'explicit server-only policy: '+name);
  check((await q("select count(*) n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef and has_function_privilege('anon',p.oid,'execute')")).rows[0].n===0,'no anonymous public SECURITY DEFINER entry point');
  check(!(await q("select has_function_privilege('authenticated','private.sync_profile_card()','execute') allowed")).rows[0].allowed,'sync trigger is not client callable');
  await asUser(null,'service_role');
  await q(`select increment_blog_views('${uid(70)}')`);
  await q(`select increment_blog_views('${uid(71)}')`);
  check((await q(`select views from blog_posts where id='${uid(70)}'`)).rows[0].views===1,'server counter still works for published article');
  check((await q(`select views from blog_posts where id='${uid(71)}'`)).rows[0].views===0,'server counter never touches draft');
  check(!(await q("select track_affiliate_click(repeat('x',65)) result")).rows[0].result.success,'oversized affiliate code rejected');
  await owner();
  // Exercise a real restore into a second isolated engine using a logical dump,
  // not a restore of production data or an invocation of a hosted backup.
  const { PGlite }=require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
  const restored=await PGlite.create({loadDataDir:await db.dumpDataDir()});
  try {
    check((await restored.query('select count(*) n from profile_cards')).rows[0].n===members,'isolated database snapshot restores directory count');
    check((await restored.query("select reloptions from pg_class where oid='public.public_profiles'::regclass")).rows[0].reloptions.includes('security_invoker=true'),'isolated restore retains security configuration');
  } finally {await restored.close()}
};
