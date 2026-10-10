const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
let client, requestOrigin='https://clubedasueca.co.mz', checks=0;
const check=(condition,label)=>{assert.ok(condition,label);checks++;};
function load(file) {
  const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const box={exports:{},URL,URLSearchParams,Response,process:{env:{NEXT_PUBLIC_BASE_URL:'https://clubedasueca.co.mz',NODE_ENV:'production'}},require(name){
    if(name==='@/features/auth/recovery')return model;
    if(name==='@/lib/supabase/server')return {createClient:async()=>client};
    if(name==='next/server')return {NextResponse:{redirect:url=>new Response(null,{status:307,headers:{location:String(url)}})}};
    if(name==='next/navigation')return {redirect:url=>{throw Object.assign(new Error('redirect'),{destination:url});}};
    if(name==='next/cache')return {revalidatePath:()=>{}};
    if(name==='next/headers')return {headers:async()=>new Headers({origin:requestOrigin})};
    if(name==='@/features/affiliates/actions')return {};
    throw new Error('Unexpected import '+name);
  }};
  vm.runInNewContext(source,box);return box.exports;
}
const model=load('src/features/auth/recovery.ts');
const confirm=load('src/app/auth/confirm/route.ts');
const callback=load('src/app/auth/callback/route.ts');
const actions=load('src/app/auth/actions.ts');
function fixture({invalid=false,banned=false,anonymous=false,recovery=false,updateError=null}={}) {
  const calls=[];
  client={auth:{
    verifyOtp:async input=>{calls.push(['verify',input]);return {error:invalid?{}:null};},
    exchangeCodeForSession:async()=>({data:{redirectType:recovery?'recovery':null},error:invalid?{}:null}),
    getUser:async()=>({data:{user:anonymous?null:{id:'fixture'}},error:null}),
    signOut:async()=>{calls.push(['signOut']);},
    resetPasswordForEmail:async(email,options)=>{calls.push(['send',email,options]);return {error:null};},
    updateUser:async()=>{calls.push(['update']);return {error:updateError};},
  },from:()=>({select:()=>({eq:()=>({single:async()=>({data:{is_banned:banned}})})})})};
  return calls;
}
async function main(){
  for(const origin of ['https://clubedasueca.co.mz','https://clubedasueca.pt','https://www.clubedasueca.co.mz'])check(model.recoveryOrigin(origin)===origin,'known origin preserved');
  for(const origin of ['https://clubedasueca.co.mz.attacker.invalid','https://attacker.invalid','http://clubedasueca.pt','https://user@clubedasueca.pt','https://clubedasueca.pt/evil','https://clubedasueca.pt:444'])check(model.recoveryOrigin(origin)==='https://clubedasueca.co.mz','untrusted origin rejected');
  for(const next of ['//attacker.invalid','/\\attacker.invalid','https://attacker.invalid','/\n/evil'])check(model.safeAuthNext(next)==='/dashboard','unsafe auth destination rejected');
  check(model.safeAuthNext('/update-password')==='/update-password','valid auth destination');
  check(!!model.passwordValidation('short','short'),'short password denied');
  check(!!model.passwordValidation('ExampleTest123','Mismatch123'),'confirmation mismatch denied');
  check(model.passwordValidation('ExampleTest123','ExampleTest123')===null,'valid confirmed password');
  let calls=fixture();
  let response=await confirm.GET(new Request('https://clubedasueca.co.mz/auth/confirm?token_hash=fixture-token&type=recovery'));
  check(response.headers.get('location')==='https://clubedasueca.co.mz/update-password','verified email reaches password form');
  check(calls[0][1].type==='recovery','token only verified as recovery');
  check(response.headers.get('cache-control')==='no-store'&&response.headers.get('referrer-policy')==='no-referrer','token response not cached/leaked');
  fixture({invalid:true});response=await confirm.GET(new Request('https://clubedasueca.pt/auth/confirm?token_hash=used-token&type=recovery'));
  check(response.headers.get('location').endsWith('/update-password?error=invalid_link'),'expired/used link offers restart');
  calls=fixture();await confirm.GET(new Request('https://clubedasueca.pt/auth/confirm?token_hash=token&type=signup'));
  check(calls.length===0,'wrong verification type never consumed');
  calls=fixture({banned:true});response=await confirm.GET(new Request('https://clubedasueca.pt/auth/confirm?token_hash=token&type=recovery'));
  check(response.headers.get('location').includes('/login?message=')&&calls.some(c=>c[0]==='signOut'),'banned recovery session signed out');
  fixture({recovery:true});response=await callback.GET(new Request('https://clubedasueca.pt/auth/callback?code=fixture'));
  check(response.headers.get('location').endsWith('/update-password'),'legacy root fallback recognizes recovery');
  fixture();response=await callback.GET(new Request('https://clubedasueca.pt/auth/callback?code=fixture&next=//attacker.invalid'));
  check(response.headers.get('location')==='https://clubedasueca.pt/dashboard','callback cannot redirect off site');
  calls=fixture();const email=new FormData();email.set('email','fixture@example.invalid');
  check((await actions.forgotPassword(email)).success,'forgot success shown explicitly');
  check(calls[0][2].redirectTo==='https://clubedasueca.co.mz/auth/confirm','email requested with correct confirm destination');
  requestOrigin='https://clubedasueca.pt';calls=fixture();await actions.forgotPassword(email);
  check(calls[0][2].redirectTo==='https://clubedasueca.pt/auth/confirm','same-host recovery on alternate domain');
  const password=new FormData();password.set('password','ExampleTest123');password.set('confirmPassword','ExampleTest123');
  calls=fixture({anonymous:true});check(!!(await actions.updatePassword(password)).error&&!calls.some(c=>c[0]==='update'),'anonymous cannot set password');
  calls=fixture({banned:true});check(!!(await actions.updatePassword(password)).error&&!calls.some(c=>c[0]==='update'),'banned account cannot set password');
  calls=fixture();let destination;try{await actions.updatePassword(password);}catch(error){destination=error.destination;}
  check(destination==='/dashboard'&&calls.some(c=>c[0]==='update'),'verified password update returns to game');
  fixture({updateError:{code:'same_password'}});check((await actions.updatePassword(password)).error.includes('diferente'),'same password explained');
  console.log('PASS '+checks+' recovery action/route/origin/password checks (mocked Auth; no email sent)');
}
main().catch(error=>{console.error('FAIL',error.message);process.exitCode=1;});
