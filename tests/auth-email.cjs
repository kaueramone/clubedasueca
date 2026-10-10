const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const assert = require('node:assert/strict');
const { Webhook } = require('standardwebhooks');
const secret = Buffer.from('fixture-signing-secret-not-for-production').toString('base64');
let checks = 0, sends = [], providerStatus = 200;
const check = (condition, label) => { assert.ok(condition, label); checks++; };
const env = {AUTH_EMAIL_HOOK_ENABLED:'true',AUTH_EMAIL_VERIFIED_DOMAINS:'clubedasueca.pt,clubedasueca.co.mz',RESEND_API_KEY_PT:'fixture-pt',RESEND_API_KEY_MZ:'fixture-mz',SEND_EMAIL_HOOK_SECRET:'v1,whsec_'+secret,NEXT_PUBLIC_SUPABASE_URL:'https://fixture.supabase.co'};
function load(file) {
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const box={exports:{},URL,Response,Request,Buffer,AbortSignal,process:{env},fetch:async(url,options)=>{sends.push({url,options,emails:JSON.parse(options.body)});return new Response('{}',{status:providerStatus});},require(name){if(name==='@/features/auth/email')return model;return require(name);}};
  vm.runInNewContext(source,box);return box.exports;
}
const model=load('src/features/auth/email.ts');
const route=load('src/app/api/auth/send-email/route.ts');
const token='pkce_'+'a'.repeat(56), second='pkce_'+'b'.repeat(56);
const event=(domain='clubedasueca.pt',action='recovery')=>({user:{email:'fixture@example.invalid',new_email:'new@example.invalid'},email_data:{redirect_to:`https://${domain}/auth/confirm`,site_url:'https://clubedasueca.pt/',email_action_type:action,token_hash:token,token_hash_new:second,token:'123456'}});
function request(payload, {id='fixture-event',time=new Date(),signature,raw}={}) {
  const body=raw||JSON.stringify(payload), sign=signature||new Webhook(secret).sign(id,time,body);
  return new Request('https://clubedasueca.pt/api/auth/send-email',{method:'POST',headers:{'webhook-id':id,'webhook-timestamp':String(Math.floor(time.getTime()/1000)),'webhook-signature':sign},body});
}
async function main() {
  for(const domain of model.emailDomains)for(const prefix of ['','www.']) {
    const email=model.buildAuthEmails(event(prefix+domain),'https://fixture.supabase.co')[0];
    check(email.from===`Clube da Sueca <noreply@${domain}>`,'sender matches request domain');
    check(email.text.includes(`https://${prefix}${domain}/auth/confirm?token_hash=`),'recovery stays on origin with scan-safe link');
  }
  for(const bad of ['https://clubedasueca.pt.evil.invalid/','http://clubedasueca.pt/','https://name@clubedasueca.pt/','https://clubedasueca.pt:444/','https://evil.invalid/'])assert.throws(()=>model.emailOrigin(bad));checks+=5;
  for(const domain of ['clubedasueca.com','clubedasueca.com.br']) {
    const email=model.buildAuthEmails(event(domain),'https://fixture.supabase.co')[0];
    check(email.from==='Clube da Sueca <noreply@clubedasueca.pt>','other production domains use approved .pt sender');
    check(email.text.includes(`https://${domain}/auth/confirm?`),'fallback sender preserves original recovery link');
  }
  for(const action of ['signup','invite','magiclink','email'])check(model.buildAuthEmails(event('clubedasueca.co.mz',action),'https://fixture.supabase.co')[0].text.includes('redirect_to=https%3A%2F%2Fclubedasueca.co.mz%2Fauth%2Fcallback'),'other auth flows retain request domain');
  const change=model.buildAuthEmails(event('clubedasueca.pt','email_change'),'https://fixture.supabase.co');
  check(change.length===2&&change[0].to[0]==='fixture@example.invalid'&&change[1].to[0]==='new@example.invalid','secure email change sends both confirmations');
  check(change[0].text.includes(second)&&change[1].text.includes(token),'secure email change uses correct reversed hashes');
  const one=event('clubedasueca.pt','email_change');delete one.email_data.token_hash_new;
  check(model.buildAuthEmails(one,'https://fixture.supabase.co').length===1,'non-secure email change sends only to new address');
  check(model.buildAuthEmails(event('clubedasueca.pt','reauthentication'),'https://fixture.supabase.co')[0].text.includes('123456'),'reauthentication uses OTP');
  for(const action of ['password_changed_notification','email_changed_notification','phone_changed_notification','identity_linked_notification','identity_unlinked_notification','mfa_factor_enrolled_notification','mfa_factor_unenrolled_notification'])check(!model.buildAuthEmails(event('clubedasueca.pt',action),'https://fixture.supabase.co')[0].text.includes(token),'security notices contain no access tokens');
  const fallback=event();fallback.email_data.redirect_to='';
  check(model.buildAuthEmails(fallback,'https://fixture.supabase.co')[0].from.endsWith('@clubedasueca.pt>'),'events without redirect use trusted site URL');
  const injected=event();injected.user.email='victim@example.invalid\r\nBcc:other@example.invalid';assert.throws(()=>model.buildAuthEmails(injected,'https://fixture.supabase.co'));checks++;
  let response=await route.POST(request(event()));check(response.status===200&&sends.length===1,'signed hook accepted');
  check(sends[0].url==='https://api.resend.com/emails/batch'&&sends[0].options.headers['Idempotency-Key']==='auth-fixture-event','fixed provider endpoint and retry deduplication');
  response=await route.POST(request(event()));check(response.status===200&&sends[1].options.headers['Idempotency-Key']===sends[0].options.headers['Idempotency-Key'],'repeated hook retains same provider idempotency key');
  check(sends[0].options.headers.Authorization==='Bearer fixture-pt','Portuguese sender uses its domain restricted key');
  response=await route.POST(request(event('clubedasueca.co.mz'),{id:'fixture-mz-event'}));
  check(response.status===200&&sends.at(-1).options.headers.Authorization==='Bearer fixture-mz','Mozambican sender uses its own domain restricted key');
  const before=sends.length;
  check((await route.POST(request(event(),{signature:'v1,invalid'}))).status===401,'forged signature rejected');
  check((await route.POST(request(event(),{time:new Date(Date.now()-600000)}))).status===401,'expired signed request rejected');
  check((await route.POST(request(event(),{time:new Date(Date.now()+600000)}))).status===401,'future signed request rejected');
  check((await route.POST(request(event('evil.invalid')))).status===400,'signed untrusted origin rejected');
  check((await route.POST(request(event('clubedasueca.pt','unknown')))).status===400,'unknown event rejected');
  check((await route.POST(request(event(),{raw:'x'.repeat(65537)}))).status===413,'oversized request rejected');
  env.AUTH_EMAIL_VERIFIED_DOMAINS='clubedasueca.pt';check((await route.POST(request(event()))).status===503,'partial domain setup cannot activate hook');
  env.AUTH_EMAIL_VERIFIED_DOMAINS=model.emailDomains.join(',');env.AUTH_EMAIL_HOOK_ENABLED='false';check((await route.POST(request(event()))).status===503,'hook disabled by default');
  check(sends.length===before,'invalid or disabled requests never send email');
  env.AUTH_EMAIL_HOOK_ENABLED='true';providerStatus=429;
  response=await route.POST(request(event()));check(response.status===503&&!JSON.stringify(await response.json()).includes('fixture'),'provider failure is retryable and does not leak details');
  console.log(`PASS ${checks} auth email domain, payload, signature, expiry, idempotency and provider failure checks (no email sent)`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
