const fs = require('node:fs'), path = require('node:path');
module.exports = async ({db,check,deny,asUser,owner,uid,root}) => {
  await owner();
  await db.exec(`create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb) $$; grant execute on function auth.jwt() to authenticated,service_role;`);
  const file = fs.readdirSync(path.join(root,'supabase/migrations')).find(n=>n.endsWith('_admin_mfa.sql'));
  await db.exec(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));
  const q=sql=>db.query(sql);
  await db.exec(`update profiles set role='admin',is_banned=false where id='${uid(4)}'; insert into live_conversations(id,user_id,subject,status) values ('${uid(89)}','${uid(2)}','MFA test','waiting_agent');`);
  await asUser(uid(4));
  for (const claims of ['{}','{"aal":"aal1"}','{"user_metadata":{"aal":"aal2"}}']) {
    await q(`select set_config('request.jwt.claims','${claims}',false)`);
    check(!(await q('select is_admin() ok')).rows[0].ok,'admin without trusted AAL2 denied');
    check((await q('select id from profiles')).rows.length===1,'AAL1 admin cannot read other private profiles');
    check((await q(`select id from live_conversations where id='${uid(89)}'`)).rows.length===0,'support RLS requires MFA');
    await deny(`select set_support_ticket_status('${uid(89)}','active')`,'support transition cannot bypass MFA via direct RPC');
    await deny(`select append_support_message('${uid(89)}','MFA bypass')`,'support message cannot bypass MFA via direct RPC');
    await deny(`update profiles set role='user' where id='${uid(4)}'`,'own profile cannot bypass protected role at AAL1');
  }
  await q(`select set_config('request.jwt.claims','{"aal":"aal2"}',false)`);
  check((await q('select is_admin() ok')).rows[0].ok,'active admin with AAL2 authorized');
  check((await q('select id from profiles')).rows.length>1,'AAL2 admin can manage private profiles');
  check((await q(`select id from live_conversations where id='${uid(89)}'`)).rows.length===1,'AAL2 support access restored');
  await q(`select set_support_ticket_status('${uid(89)}','active')`);
  check((await q(`select status from live_conversations where id='${uid(89)}'`)).rows[0].status==='active','AAL2 support transition works');
  await q(`select append_support_message('${uid(89)}','Verified admin')`);
  check((await q(`select message from live_messages where conversation_id='${uid(89)}' and message='Verified admin'`)).rows.length===1,'AAL2 support reply works');
  await owner(); await q(`update profiles set is_banned=true where id='${uid(4)}'`);
  await asUser(uid(4));
  check(!(await q('select is_admin() ok')).rows[0].ok,'banned admin denied even with AAL2');
  await asUser(uid(2));
  check(!(await q('select is_admin() ok')).rows[0].ok,'ordinary user cannot become admin with MFA');
  check((await q(`select id from live_conversations where id='${uid(89)}'`)).rows.length===1,'ordinary user retains own support access');
  await q(`select append_support_message('${uid(89)}','Owner reply')`);
  check((await q(`select message from live_messages where conversation_id='${uid(89)}' and message='Owner reply'`)).rows.length===1,'owner support reply remains available without admin privileges');
  await owner();
};
