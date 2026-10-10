const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),assert=require('node:assert/strict');
let checks=0; const check=(v,label)=>{assert.ok(v,label);checks++};
function load(file,imports,extra={}){
 const box={exports:{},FormData,URL,AbortSignal,console:{warn(){},error(){}},...extra,require(n){if(n in imports)return imports[n];throw new Error('Unexpected import '+n)}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,box); return box.exports;
}
function authFixture({secret='server-secret',verification={success:true},http=true,network=false,authError=null,banned=false,profileError=false}={}){
 const calls=[];
 const client={
  auth:{
   signInWithPassword:async input=>{calls.push(['auth',input]);return {error:authError,data:{user:authError?null:{id:'qa-user'}}}},
   signOut:async()=>{calls.push(['signout'])}
  },
  from(){return {
   select(){return {eq(){return {single:async()=>({data:{is_banned:banned},error:profileError?{}:null})}}}},
   update(input){calls.push(['session',input]);return {eq:async()=>({})}}
  }}
 };
 const actions=load('src/app/auth/actions.ts',{
 'next/cache':{revalidatePath:()=>calls.push(['revalidate'])},'next/navigation':{redirect:destination=>{throw Object.assign(new Error('redirect'),{destination})}},'next/headers':{headers:async()=>new Headers()},
 '@/features/auth/recovery':{},'@/lib/supabase/server':{createClient:async()=>client},'@/features/affiliates/actions':{}
 },{Headers,crypto:require('node:crypto').webcrypto,process:{env:{TURNSTILE_SECRET_KEY:secret}},fetch:async(url,options)=>{calls.push(['verify',JSON.parse(options.body)]);if(network)throw new Error('offline');return {ok:http,json:async()=>verification}}});
 return {actions,calls};
}
const form=(token='valid-token')=>{const data=new FormData();data.set('email','  qa@example.invalid ');data.set('password','fictional-test-password');if(token!==null)data.set('cf-turnstile-response',token);return data};
function hookHarness(){let cursor=0;const slots=[],effects=[];return {slots,effects,begin(){cursor=0},react:{useState(initial){const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],v=>{slots[i]=typeof v==='function'?v(slots[i]):v}]},useRef(initial){const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i]},useCallback:fn=>fn,useEffect:fn=>effects.push(fn)}}}
async function main(){
 for(const cfg of [{secret:undefined},{secret:''},{verification:{success:false,'error-codes':['timeout-or-duplicate']}},{verification:{success:false,'error-codes':['invalid-input-response']}},{network:true},{http:false}]){
  // undefined deliberately means missing configuration, rather than default fixture secret.
  const f=authFixture({...cfg,secret:'secret' in cfg?(cfg.secret||''): 'server-secret'});const result=await f.actions.login(null,form());check(!!result.error,'verification failure returns feedback');check(!f.calls.some(c=>c[0]==='auth'),'verification failure never attempts password auth');
 }
 let f=authFixture();check((await f.actions.login(null,form(null))).error.includes('Aguarda'),'missing token explained');check(f.calls.length===0,'missing token never calls provider/auth');
 f=authFixture();check(!!(await f.actions.login(null,form('x'.repeat(2049)))).error,'oversized token denied');
 for(const [code,text] of [['invalid_credentials','Email ou senha incorretos.'],['email_not_confirmed','Confirma'],['over_request_rate_limit','Muitas tentativas'],['other_error','Não foi possível iniciar sessão']]){
  f=authFixture({authError:{code,message:'internal English provider details'}});const result=await f.actions.login(null,form());check(result.error.includes(text),'password/auth error distinct: '+code);check(f.calls.some(c=>c[0]==='verify'),'password auth still protected by server verification');
 }
 f=authFixture({banned:true});check((await f.actions.login(null,form())).error.includes('Conta indisponível'),'banned login refused');check(f.calls.some(c=>c[0]==='signout'),'banned session revoked');
 f=authFixture();let destination;try{await f.actions.login(null,form())}catch(e){destination=e.destination}check(destination==='/dashboard','successful login redirects');check(f.calls.find(c=>c[0]==='auth')[1].email==='qa@example.invalid','email trimmed for auth');check(f.calls.some(c=>c[0]==='session'),'successful login rotates platform session');
 // Execute the actual form action with controlled email state and a DOM password ref.
 const h=hookHarness();let action,resetCount=0;
 const jsx=(type,props)=>({type,props});
 const ui=load('src/components/auth/login-form.tsx',{'react':{...h.react,useActionState:fn=>{action=fn;return [{error:null},fn]}},'react/jsx-runtime':{jsx,jsxs:jsx},'./use-turnstile':{useTurnstile:()=>({containerRef:{current:null},reset:()=>resetCount++,token:'ready',error:null})},'next/link':{default:'a'},'lucide-react':{Eye:'eye',EyeOff:'eye-off'},'@/app/auth/actions':{login:async()=>({error:'Email ou senha incorretos.'})},'@/components/submit-button':{SubmitButton:'submit'}});
 const find=(node,predicate)=>{if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=find(child,predicate);if(found)return found}};
 h.begin();let tree=ui.LoginForm();find(tree,n=>n.props?.name==='email').props.onChange({target:{value:'keep-me@example.invalid'}});
 h.begin();tree=ui.LoginForm();const password=find(tree,n=>n.props?.name==='password');password.props.ref.current={value:'do-not-retain'};
 await action({error:null},form());h.begin();tree=ui.LoginForm();check(find(tree,n=>n.props?.name==='email').props.value==='keep-me@example.invalid','email preserved after failed login');check(password.props.ref.current.value==='','only password cleared');check(resetCount===1,'consumed challenge reset after attempt');
 // Exercise actual Turnstile lifecycle callbacks rather than accepting arbitrary form tokens.
 const hook=hookHarness();let options,removed=0,resets=0;
 const script={addEventListener(){},removeEventListener(){}};
 const widget={render(container,cfg){options=cfg;return 'widget'},reset(){resets++},remove(){removed++}};
 const use=load('src/components/auth/use-turnstile.ts',{'react':hook.react},{window:{turnstile:widget},document:{getElementById:()=>script},setTimeout:()=>1,clearTimeout(){}}).useTurnstile;
 hook.begin();let state=use();state.containerRef.current={};const cleanup=hook.effects[0]();check(state.token==='','submission blocked before verification');check(options['response-field']===false,'one controlled form token, no unmanaged duplicate');options.callback('verified');hook.begin();state=use();check(state.token==='verified','success callback enables submission');options['expired-callback']();hook.begin();state=use();check(state.token==='','expired token immediately invalidated');options['error-callback']();hook.begin();state=use();check(!!state.error&&!state.token,'provider failure exposes retry without bypass');state.reset();hook.begin();state=use();check(!state.token&&!state.error&&resets===1,'retry clears old token and resets widget');cleanup();options.callback('late');hook.begin();state=use();check(!state.token&&removed===1,'unmounted widget cannot restore stale token');
 console.log('PASS '+checks+' login/security/form lifecycle checks (mocked Auth and Cloudflare; no credentials or emails sent)');
}
main().catch(e=>{console.error('FAIL',e);process.exitCode=1});
