const fs=require('node:fs'),ts=require('typescript'),vm=require('node:vm'),assert=require('node:assert/strict');
let checks=0; const check=(v,s)=>{assert.ok(v,s);checks++};
function load(file,imports,extra={}) {
 const box={exports:{},...extra,require(n){if(n in imports)return imports[n];throw new Error('Unexpected import '+n)}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,box);
 return box.exports;
}
const guard=load('src/lib/admin-mfa.ts',{'server-only':{}});
function harness({verified=false,aal='aal1',verifyError=false,loadError=false}={}) {
 let cursor=0,initialized=false;const slots=[],effects=[],calls=[];
 const jsx=(type,props)=>({type,props});
 const mfa={
  listFactors:async()=>({data:loadError?null:{totp:verified?[{id:'verified',status:'verified'}]:[],all:verified?[{id:'verified',status:'verified',factor_type:'totp',friendly_name:'Clube da Sueca Admin'}]:[{id:'pending',status:'unverified',factor_type:'totp',friendly_name:'Clube da Sueca Admin'}]},error:loadError?{}:null}),
  getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:aal},error:null}),
  unenroll:async({factorId})=>{calls.push(['unenroll',factorId]);return {error:null}},
  enroll:async()=>{calls.push(['enroll']);return {data:{id:'new-factor',totp:{qr_code:'<svg>synthetic</svg>',secret:'SYNTHETIC'}},error:null}},
  challengeAndVerify:async(input)=>{calls.push(['verify',input]);return {error:verifyError?{}:null}}
 };
 const react={useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]},useRef(v){const i=cursor++;if(!(i in slots))slots[i]={current:v};return slots[i]},useEffect(fn){if(!initialized)effects.push(fn)}};
 const view=load('src/components/admin/admin-mfa.tsx',{'react':react,'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'},'lucide-react':{ShieldCheck:'svg',Loader2:'svg'},'@/lib/supabase/client':{createClient:()=>({auth:{mfa}})},'@/components/ui/button':{Button:'button'},'@/components/ui/input':{Input:'input'},'@/components/ui/card':{Card:'article'}},{window:{location:{assign:url=>calls.push(['navigate',url]),reload:()=>calls.push(['reload'])}}});
 const render=()=>{cursor=0;const tree=view.AdminMfa();initialized=true;return tree};
 const nodes=tree=>{const result=[];function walk(n){if(!n||typeof n!=='object')return;if(Array.isArray(n)){n.forEach(walk);return}result.push(n);walk(n.props?.children)}walk(tree);return result};
 const tick=async()=>{for(let i=0;i<15;i++)await Promise.resolve()};
 return {calls,slots,render,nodes,tick,async mount(){render();effects.forEach(fn=>fn());await tick();return render()}};
}
async function main(){
 for(const claims of [{aal:'aal1'},{},{user_metadata:{aal:'aal2'}}]) check(!await guard.hasAdminMfa({auth:{getClaims:async()=>({data:{claims},error:null})}}),'unverified session cannot pass server gate');
 check(!await guard.hasAdminMfa({auth:{getClaims:async()=>({data:{claims:{aal:'aal2'}},error:{}})}}),'invalid token fails closed');
 check(await guard.hasAdminMfa({auth:{getClaims:async()=>({data:{claims:{aal:'aal2'}},error:null})}}),'verified AAL2 passes server gate');
 await assert.rejects(guard.requireAdminMfa({auth:{getClaims:async()=>({data:null,error:{}})}}));checks++;
 let serviceCalls=0;
 const actions=load('src/app/admin/actions.ts',{'@/lib/admin-mfa':guard,'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:{id:'synthetic-admin'}}}),getClaims:async()=>({data:{claims:{aal:'aal1'}},error:null})},from:()=>({select:()=>({eq:()=>({single:async()=>({data:{role:'admin',is_banned:false}})})})})})},'@/lib/supabase/service':{createServiceClient:()=>{serviceCalls++;throw new Error('must not reach service')}},'next/cache':{revalidatePath(){}},'@/lib/audit':{logAudit(){}}});
 await assert.rejects(actions.getAdminStats(),/autenticador/);checks++;
 check(serviceCalls===0,'AAL1 server action cannot obtain privileged client before MFA');
 let h=harness();let tree=await h.mount();
 check(!h.calls.length,'mount never enrolls or mutates factors');
 await h.nodes(tree).find(n=>n.type==='button'&&n.props.onClick).props.onClick();tree=h.render();
 check(h.calls[0][0]==='unenroll'&&h.calls[0][1]==='pending','only unfinished app factor discarded');
 check(h.calls[1][0]==='enroll','explicit setup creates factor');
 check(h.nodes(tree).find(n=>n.type==='img').props.src.startsWith('data:image/svg+xml;'),'QR rendered as image without HTML injection');
 let input=h.nodes(tree).find(n=>n.type==='input');input.props.onChange({target:{value:'12a345678'}});tree=h.render();
 check(h.nodes(tree).find(n=>n.type==='input').props.value==='123456','code input accepts exactly six digits');
 await h.nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 check(h.calls.find(c=>c[0]==='verify')[1].factorId==='new-factor','verify uses enrolled factor');
 check(h.calls.some(c=>c[0]==='navigate'&&c[1]==='/admin'),'successful verification reloads protected server route');
 check(!h.slots.some(v=>v&&typeof v==='object'&&v.secret),'enrollment secret cleared after verification');
 h=harness({verified:true,verifyError:true});tree=await h.mount();
 check(!h.nodes(tree).some(n=>n.type==='img'),'returning admin receives challenge without exposing setup secret');
 input=h.nodes(tree).find(n=>n.type==='input');input.props.onChange({target:{value:'123456'}});tree=h.render();
 await h.nodes(tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});tree=h.render();
 check(!h.calls.some(c=>c[0]==='navigate'),'invalid code cannot unlock admin');
 check(h.nodes(tree).some(n=>n.props?.role==='alert'),'invalid code gives accessible feedback');
 check(!h.calls.some(c=>c[0]==='unenroll'||c[0]==='enroll'),'verified factor never removed or replaced');
 h=harness({verified:true,aal:'aal2'});tree=await h.mount();
 check(!h.nodes(tree).some(n=>n.type==='form'),'already verified session does not repeat enrollment');
 h=harness({loadError:true});tree=await h.mount();
 check(h.nodes(tree).some(n=>n.props?.role==='alert')&&!h.calls.length,'load failure never creates factor or unlocks admin');
 console.log(`PASS ${checks} MFA server and UI checks (synthetic Auth; no real factors or secrets)`);
}
main().catch(e=>{console.error(e);process.exitCode=1});
