/* Isolated PostgreSQL engine tests. Run: node tests/database-security.cjs
 * Requires @electric-sql/pglite, or set PGLITE_MODULE to its absolute module path.
 * Auth, grants and publication are Supabase shims. No network/database credentials used.
 */
const { PGlite } = require(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const db = new PGlite();
let assertions = 0;
const check = (condition, message) => { assert.ok(condition, message); assertions++; };
async function run(sql) { return db.query(sql); }
async function deny(sql, message) {
  let denied = false;
  try { await run(sql); } catch { denied = true; }
  check(denied, message);
}
async function asUser(id, role='authenticated') {
  await db.exec(`RESET ROLE; SET ROLE ${role}; SELECT set_config('request.jwt.claim.sub','${id || ''}',false); SELECT set_config('request.jwt.claim.role','${role}',false);`);
}
async function owner() { await db.exec('RESET ROLE'); }
const uid = n => `10000000-0000-0000-0000-${String(n).padStart(12,'0')}`;
async function main() {
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth;
    CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb,email_confirmed_at timestamptz);
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT current_setting('request.jwt.claim.role',true) $$;
    CREATE FUNCTION public.uuid_generate_v4() RETURNS uuid LANGUAGE sql AS $$ SELECT gen_random_uuid() $$;
    GRANT USAGE ON SCHEMA public,auth TO anon,authenticated,service_role;
    GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon,authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role;
    CREATE SCHEMA storage;
    CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean);
    CREATE TABLE storage.objects(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bucket_id text,name text);
    ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA storage TO anon,authenticated;
    GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;
    CREATE PUBLICATION supabase_realtime;
  `);
  const files = ['src/lib/supabase/schema.sql','supabase/admin_schema.sql',
    ...['001_audit_logs','002_financial_rpc','003_game_scoring','010_bonuses','020_affiliates','030_banners','040_crm','050_cms','060_live_chat',
      '070_profile_updates','085_chat_search_and_affiliates','086_banners_rls_fix','087_game_leave_and_cancel','090_create_banners_bucket','091_global_chat','094_single_session',
      '098_process_play_card','099_deal_in_join','102_rake20_mzn_limits','103_hide_opponent_hands_rls','104_fix_rls_recursion','105_fix_draw_rake_audit_and_audit_insert_policy']
      .map(n => `supabase/migrations/${n}.sql`)];
  for (const file of files) {
    let sql = fs.readFileSync(path.join(root,file),'utf8').replace(/CREATE EXTENSION IF NOT EXISTS "uuid-ossp";/,'');
    await db.exec(sql);
  }
  await db.exec(`ALTER TABLE public.games ADD COLUMN turn_started_at timestamptz DEFAULT now();
    ALTER TABLE public.profiles ADD COLUMN last_seen_at timestamptz;
    CREATE FUNCTION public.touch_last_seen() RETURNS void LANGUAGE sql SECURITY DEFINER AS $$ UPDATE public.profiles SET last_seen_at=now() WHERE id=auth.uid() $$;`);
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/106_beta_security_and_game_contract.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/107_support_integrity.sql'),'utf8'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations/108_review_accounting_and_admin.sql'),'utf8'));
  console.log('PASS migrations 106/107/108 apply to isolated PostgreSQL');
  await deny(`INSERT INTO auth.users VALUES ('${uid(9)}','minor@example.invalid','{"birth_date":"2020-01-01"}',now())`,'minor via auth API rejected');
  for(let n=1;n<=5;n++) {
    await run(`INSERT INTO auth.users VALUES ('${uid(n)}','test${n}@example.invalid','{"birth_date":"1990-01-01","full_name":"Test ${n}"}',${n===5?'NULL':'now()'})`);
  }
  check((await run(`SELECT balance FROM wallets WHERE user_id='${uid(1)}'`)).rows[0].balance==='100.00','welcome credited');
  await run(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${uid(1)}'`);
  check((await run(`SELECT balance FROM wallets WHERE user_id='${uid(1)}'`)).rows[0].balance==='100.00','welcome retry does not overwrite or duplicate');
  check((await run(`SELECT balance FROM wallets WHERE user_id='${uid(5)}'`)).rows[0].balance==='0.00','no welcome before activation');
  await run(`UPDATE auth.users SET email_confirmed_at=now() WHERE id='${uid(5)}'`);
  check((await run(`SELECT balance FROM wallets WHERE user_id='${uid(5)}'`)).rows[0].balance==='100.00','welcome after confirmation');
  await asUser(null,'anon');
  await deny(`SELECT public.process_deposit('${uid(1)}',50)`,'anonymous deposit denied');
  await deny(`SELECT * FROM wallets`,'anonymous ledger denied');
  await asUser(uid(1));
  const temporary=(await run(`SELECT process_create_game('${uid(1)}',10) result`)).rows[0].result.game_id;
  await asUser(uid(2)); await run(`SELECT process_join_game('${uid(2)}','${temporary}',NULL)`);
  await run(`SELECT process_leave_game('${uid(2)}','${temporary}')`);
  await deny(`SELECT process_leave_game('${uid(2)}','${temporary}')`,'duplicate leave refused');
  await asUser(uid(1)); await run(`SELECT process_cancel_game('${uid(1)}','${temporary}')`);
  check((await run(`SELECT balance FROM wallets WHERE user_id='${uid(1)}'`)).rows[0].balance==='100.00','cancel refunds exactly once');
  await deny(`SELECT process_cancel_game('${uid(1)}','${temporary}')`,'duplicate cancel refused');
  await deny(`SELECT public.process_deposit('${uid(2)}',50)`,'foreign deposit denied');
  await deny(`UPDATE profiles SET role='admin' WHERE id='${uid(1)}'`,'self-promotion denied');
  await deny(`UPDATE profiles SET birth_date='1980-01-01' WHERE id='${uid(1)}'`,'eligibility editing denied');
  check((await run(`SELECT email FROM profiles WHERE id='${uid(2)}'`)).rows.length===0,'foreign PII hidden');
  check((await run(`SELECT * FROM public_profiles`)).rows.length===5,'directory available');
  await deny(`SELECT email FROM public_profiles`,'directory has no email');
  await run(`UPDATE profiles SET username='newnick' WHERE id='${uid(1)}'`);
  await deny(`SELECT public.process_deposit('${uid(1)}','NaN'::numeric)`,'NaN denied');
  await deny(`SELECT public.process_withdrawal('${uid(1)}',250,'phone')`,'withdrawal disabled');
  await deny(`SELECT public.apply_bonus('${uid(1)}',gen_random_uuid(),100)`,'arbitrary bonus denied');
  await deny(`SELECT public.increment_user_metrics('${uid(1)}',0,0,0,100,0,0)`,'forged metrics denied');
  const game = (await run(`SELECT public.process_create_game('${uid(1)}',50) result`)).rows[0].result.game_id;
  await deny(`SELECT public.process_join_game('${uid(2)}','${game}',NULL)`,'foreign join denied');
  for(let n=2;n<=4;n++) { await asUser(uid(n)); await run(`SELECT public.process_join_game('${uid(n)}','${game}',NULL)`); }
  await asUser(uid(5)); await deny(`SELECT process_join_game('${uid(5)}','${game}',NULL)`,'fifth player refused');
  await owner();
  check((await run(`SELECT count(DISTINCT c) n FROM game_players gp CROSS JOIN LATERAL jsonb_array_elements_text(hand) c WHERE game_id='${game}'`)).rows[0].n===40,'exactly 40 distinct cards dealt');
  await deny(`SELECT public.deal_cards_for_game('${game}')`,'second deal rejected internally');
  await asUser(uid(1));
  await deny(`SELECT public.deal_cards_for_game('${game}')`,'client deal denied');
  await deny(`SELECT public.process_game_end('${game}',120,0)`,'client settlement denied');
  await deny(`SELECT public.process_play_card('${game}','hearts-A','${uid(2)}')`,'foreign play denied');
  const snapshot = (await run(`SELECT public.get_table_state('${game}') result`)).rows[0].result;
  check(snapshot.players.filter(p=>p.hand.length>0).length===1,'snapshot reveals own hand only');
  check(snapshot.players.every(p=>p.card_count===10),'snapshot public counts');
  check(Boolean(snapshot.game.trump_card && snapshot.game.turn_deadline),'snapshot trump/deadline');
  const early=(await run(`SELECT public.process_turn_timeout('${game}') result`)).rows[0].result;
  check(Boolean(early.error),'early timeout refused');
  await owner(); await run(`UPDATE games SET turn_started_at=now()-interval '31 seconds' WHERE id='${game}'`);
  await asUser(uid(1));
  check(!(await run(`SELECT process_turn_timeout('${game}') result`)).rows[0].result.error,'participant can recover expired other turn');
  check(Boolean((await run(`SELECT process_turn_timeout('${game}') result`)).rows[0].result.error),'duplicate timeout cannot play next turn early');
  await asUser(uid(5));
  await deny(`SELECT public.process_turn_timeout('${game}')`,'outsider timeout denied');
  await asUser(uid(1));
  await owner();
  await run(`UPDATE profiles SET is_banned=true WHERE id='${uid(5)}'`);
  await asUser(uid(5));
  await deny(`SELECT public.process_create_game('${uid(5)}',50)`,'banned create denied');
  // Play a complete game through the actual SQL rule engine, no fabricated score.
  for(let turn=1;turn<40;turn++) {
    await owner(); await run(`UPDATE games SET turn_started_at=now()-interval '31 seconds' WHERE id='${game}'`);
    await asUser(null,'service_role');
    const result=(await run(`SELECT public.process_turn_timeout('${game}') result`)).rows[0].result;
    check(!result.error,`valid timeout turn ${turn+1}`);
  }
  await owner();
  const finished=(await run(`SELECT * FROM games WHERE id='${game}'`)).rows[0];
  check(finished.status==='finished' && finished.score_a+finished.score_b===120,'complete valid game sums 120');
  check((await run(`SELECT count(*) n FROM private.game_effects WHERE game_id='${game}'`)).rows[0].n===1,'effects committed once');
  const balances=JSON.stringify((await run('SELECT user_id,balance FROM wallets ORDER BY user_id')).rows);
  await run(`SELECT public.process_game_end('${game}',${finished.score_a},${finished.score_b})`);
  check(JSON.stringify((await run('SELECT user_id,balance FROM wallets ORDER BY user_id')).rows)===balances,'settlement retry idempotent');
  // Targeted draw settlement fixture. The full-game loop above tests actual play rules;
  // this fixture independently tests the 60/60 accounting branch and actual fee source.
  const draw=(await run(`INSERT INTO games(status,stake,host_id) VALUES('playing',50,'${uid(1)}') RETURNING id`)).rows[0].id;
  for(let n=1;n<=4;n++) {
    await run(`INSERT INTO game_players(game_id,user_id,position,team) VALUES('${draw}','${uid(n)}',${n-1},'${n%2?'A':'B'}')`);
    await run(`UPDATE wallets SET balance=balance-50 WHERE user_id='${uid(n)}'`);
  }
  await run(`INSERT INTO game_moves(game_id,player_id,card,round_number,trick_number)
    SELECT '${draw}','${uid(1)}',s||'-'||r,1,1 FROM unnest(ARRAY['hearts','diamonds','clubs','spades'])s CROSS JOIN unnest(ARRAY['2','3','4','5','6','Q','J','K','7','A'])r`);
  const affiliate=(await run(`INSERT INTO affiliates(user_id,status) VALUES('${uid(5)}','approved') RETURNING id`)).rows[0].id;
  await run(`INSERT INTO affiliate_referrals(affiliate_id,referred_user_id) VALUES('${affiliate}','${uid(1)}')`);
  await run(`SELECT process_game_end('${draw}',60,60)`);
  check((await run(`SELECT count(*) n FROM affiliate_commissions WHERE source_id='${draw}'`)).rows[0].n===0,'draw no affiliate commission');
  check((await run(`SELECT coalesce(sum(amount),0) amount FROM house_revenue WHERE game_id='${draw}'`)).rows[0].amount==='0','draw no rake');
  check((await run(`SELECT count(*) n FROM transactions WHERE reference_id='${draw}' AND type='refund'`)).rows[0].n===4,'draw four refunds');
  const drawBalances=JSON.stringify((await run('SELECT user_id,balance FROM wallets ORDER BY user_id')).rows);
  await run(`SELECT process_game_end('${draw}',60,60);`);
  await run(`SELECT process_affiliate_commission('${draw}',100000)`);
  check(JSON.stringify((await run('SELECT user_id,balance FROM wallets ORDER BY user_id')).rows)===drawBalances,'draw duplicate no credit');
  check((await run(`SELECT count(*) n FROM affiliate_commissions WHERE source_id='${draw}'`)).rows[0].n===0,'caller fee cannot fabricate commission');
  await run(`UPDATE private.app_config SET mode='paused'`);
  await asUser(uid(1)); await deny(`SELECT public.process_deposit('${uid(1)}',50)`,'paused mode refuses simulation');
  await owner();
  const msg=(await run(`INSERT INTO global_messages(user_id,content) VALUES('${uid(1)}','Olá') RETURNING id`)).rows[0].id;
  await asUser(null,'service_role');
  check(Boolean((await run(`SELECT claim_community_message('${msg}') result`)).rows[0].result),'webhook claim');
  check((await run(`SELECT claim_community_message('${msg}') result`)).rows[0].result===null,'webhook dedup');
  await owner();
  for(let n=0;n<3;n++) {
    const next=(await run(`INSERT INTO global_messages(user_id,content) VALUES('${uid(1)}','Test') RETURNING id`)).rows[0].id;
    const claim=(await run(`SELECT claim_community_message('${next}') result`)).rows[0].result;
    check(n<2 ? Boolean(claim) : claim===null,'webhook per-sender request cap');
  }
  await asUser(uid(1));
  const ticket=(await run(`SELECT create_support_ticket('Ajuda','Como jogar?') id`)).rows[0].id;
  check((await run(`SELECT count(*) n FROM live_messages WHERE conversation_id='${ticket}'`)).rows[0].n===1,'ticket first message atomic');
  await deny(`INSERT INTO live_messages(conversation_id,sender_id,is_bot,message) VALUES('${ticket}','${uid(1)}',true,'forged')`,'forged support bot denied');
  await deny(`UPDATE live_messages SET message='changed' WHERE conversation_id='${ticket}'`,'support edits denied');
  await deny(`DELETE FROM live_messages WHERE conversation_id='${ticket}'`,'support deletion denied');
  await asUser(uid(2));
  check((await run(`SELECT * FROM live_conversations WHERE id='${ticket}'`)).rows.length===0,'other support ticket hidden');
  check((await run(`SELECT * FROM live_messages WHERE conversation_id='${ticket}'`)).rows.length===0,'other support messages hidden');
  await deny(`SELECT append_support_message('${ticket}','Intrusão')`,'other support append denied');
  await asUser(uid(1));
  await run(`SELECT append_support_message('${ticket}','Falar com pessoa')`);
  check((await run(`SELECT status FROM live_conversations WHERE id='${ticket}'`)).rows[0].status==='waiting_agent','followup goes to human queue');
  await owner();
  await run(`UPDATE profiles SET role='admin' WHERE id='${uid(4)}'`);
  await run(`UPDATE live_conversations SET agent_id='${uid(4)}' WHERE id='${ticket}'`);
  await asUser(uid(4));
  await run(`SELECT append_support_message('${ticket}','Vamos ajudar')`);
  await run(`SELECT resolve_support_ticket('${ticket}')`);
  check((await run(`SELECT status FROM live_conversations WHERE id='${ticket}'`)).rows[0].status==='resolved','assigned admin resolves ticket');
  await asUser(uid(1)); await run(`SELECT append_support_message('${ticket}','Preciso de revisão')`);
  check((await run(`SELECT status FROM live_conversations WHERE id='${ticket}'`)).rows[0].status==='waiting_agent','user reopens resolved ticket');
  await owner();
  const legacy=(await run(`INSERT INTO support_tickets(user_id,subject) VALUES('${uid(1)}','Legacy') RETURNING id`)).rows[0].id;
  await run(`INSERT INTO support_messages(ticket_id,sender_id,message) VALUES('${legacy}','${uid(1)}','Private')`);
  await asUser(uid(2));
  check((await run(`SELECT * FROM support_tickets WHERE id='${legacy}'`)).rows.length===0,'legacy support private');
  check((await run(`SELECT * FROM support_messages WHERE ticket_id='${legacy}'`)).rows.length===0,'legacy message private');
  await asUser(null,'anon');
  await deny(`SELECT create_support_ticket('Test','Help')`, 'anonymous support denied');
  await asUser(uid(1));
  await deny(`SELECT create_support_ticket('','bad')`, 'invalid ticket rejected');
  check((await run(`SELECT * FROM support_messages WHERE ticket_id='${legacy}'`)).rows.length===1,'legacy own history readable');
  await deny(`DELETE FROM support_tickets WHERE id='${legacy}'`,'legacy writes denied');
  await owner();
  await run('UPDATE wallets SET balance=balance+1000');
  // Fractional stake fixture verifies exact accounting, independent from card engine.
  for (const stake of [50.01,50.02,50.03,50.04,50.05]) {
    const fractional=(await run(`INSERT INTO games(status,stake,host_id) VALUES('playing',${stake},'${uid(1)}') RETURNING id`)).rows[0].id;
    for (let n=1;n<=4;n++) {
      await run(`INSERT INTO game_players(game_id,user_id,position,team) VALUES('${fractional}','${uid(n)}',${n-1},'${n%2?'A':'B'}')`);
      await run(`UPDATE wallets SET balance=balance-${stake} WHERE user_id='${uid(n)}'`);
    }
    await run(`INSERT INTO game_moves(game_id,player_id,card,round_number,trick_number)
      SELECT '${fractional}','${uid(1)}',s||'-'||r,1,1 FROM unnest(ARRAY['hearts','diamonds','clubs','spades'])s CROSS JOIN unnest(ARRAY['2','3','4','5','6','Q','J','K','7','A'])r`);
    await run(`SELECT process_game_end('${fractional}',80,40)`);
    const total=(await run(`SELECT (SELECT sum(amount) FROM transactions WHERE reference_id='${fractional}' AND type='win') + (SELECT sum(amount) FROM house_revenue WHERE game_id='${fractional}') amount`)).rows[0].amount;
    check(Math.round(Number(total)*100) === Math.round(stake*4*100), `stake ${stake} exact pot conservation`);
  }
  const banner=(await run(`INSERT INTO banners(title) VALUES('Test') RETURNING id`)).rows[0].id;
  await asUser(uid(1));
  check((await run(`SELECT record_banner_click('${banner}') result`)).rows[0].result,'banner click recorded');
  await deny(`INSERT INTO banner_clicks(banner_id,user_id) VALUES('${banner}','${uid(2)}')`,'forged banner click denied');
  await owner();
  check((await run(`SELECT clicks FROM banners WHERE id='${banner}'`)).rows[0].clicks===1,'banner counter atomic');
  await run(`UPDATE private.app_config SET mode='beta'`);
  const manualBonus=(await run(`INSERT INTO bonuses(name,type,amount) VALUES('Manual test','vip_reward',10) RETURNING id`)).rows[0].id;
  await asUser(uid(4));
  const applied=(await run(`SELECT admin_apply_bonus('${uid(1)}','${manualBonus}') result`)).rows[0].result;
  check(!applied.error,'admin bonus two-argument contract succeeds');
  await run(`INSERT INTO storage.objects(bucket_id,name) VALUES('banners','valid.png')`);
  await deny(`INSERT INTO storage.objects(bucket_id,name) VALUES('private','forbidden.png')`,'admin banner storage retains bucket restriction');
  await owner();
  await run(`UPDATE profiles SET is_banned=true WHERE id='${uid(4)}'`);
  await asUser(uid(4));
  check((await run('SELECT is_admin() allowed')).rows[0].allowed===false,'banned admin not authorized');
  check((await run(`UPDATE affiliates SET total_earned=987654 RETURNING id`)).rows.length===0,'banned admin cannot mutate affiliates');
  await deny(`INSERT INTO bonuses(name,type,amount) VALUES('Injected','welcome',100)`,'banned admin bonus insert denied');
  check((await run(`UPDATE banners SET title='hacked' RETURNING id`)).rows.length===0,'banned admin cannot mutate banners');
  await deny(`SELECT record_banner_click('${banner}')`,'banned banner click denied');
  await deny(`INSERT INTO storage.objects(bucket_id,name) VALUES('banners','banned.png')`,'banned admin storage insert denied');
  await deny(`INSERT INTO blog_posts(slug,title,content) VALUES('forged','Forged','text')`,'banned admin CMS insert denied');
  await owner();
  const unguarded=(await run(`SELECT count(*) n FROM pg_policies WHERE schemaname IN ('public','storage') AND lower(policyname) LIKE '%admin%' AND coalesce(qual,with_check,'') NOT LIKE '%is_admin%'`)).rows[0].n;
  check(unguarded===0,'all installed legacy admin policies require active admin');
  await asUser(uid(5));
  let missingCode;
  try { await run(`SELECT get_table_state('${uid(99)}')`); } catch(error) { missingCode=error.code; }
  check(missingCode==='P0002','missing table gives recoverable P0002');
  let forbiddenCode;
  try { await run(`SELECT get_table_state('${game}')`); } catch(error) { forbiddenCode=error.code; }
  check(forbiddenCode==='42501','inaccessible existing table differs from deleted table');
  console.log(`PASS ${assertions} security/game assertions (local PostgreSQL; no deployed Supabase claim)`);
  await db.close();
}
main().catch(error=>{console.error('FAIL',error.message); process.exitCode=1;});
