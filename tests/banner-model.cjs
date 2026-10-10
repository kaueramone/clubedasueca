const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = ts.transpileModule(fs.readFileSync('src/features/banners/model.ts','utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const sandbox = { exports: {}, URL };
vm.runInNewContext(code, sandbox);
const { safeBannerLink, validateBanner } = sandbox.exports;
let checks = 0;
function check(condition, label) { assert.ok(condition, label); checks++; }
for (const template of ['classic','informational','promotional']) {
  const result = validateBanner({template,title:'  Novidades  ',description:'Texto',link_url:'/dashboard/play',cta_label:'Jogar'});
  check(result.data?.title === 'Novidades' && result.data.template === template,'valid template with button');
}
const base = {template:'classic',title:'Título'};
check(validateBanner(base).data?.cta_label === null,'button optional');
for (const link of ['javascript:alert(1)','data:text/html,abc','http://example.com','//example.com','/\\example.com','https://user:pass@example.com','https://example.com/a b','https://example.com/\nabc']) {
  check(safeBannerLink(link) === null,'unsafe URL: '+link);
  check(!!validateBanner({...base,link_url:link,cta_label:'Abrir'}).error,'unsafe link rejected on save');
}
for (const link of ['/dashboard/play','https://example.com/aviso?a=1#ler']) check(safeBannerLink(link) === link,'safe destination');
for (const input of [
  {...base,template:'unknown'}, {...base,title:' '}, {...base,title:'a'.repeat(101)},
  {...base,description:'a'.repeat(501)}, {...base,link_url:'/dashboard'},
  {...base,cta_label:'Abrir'}, {...base,link_url:'/dashboard',cta_label:'a'.repeat(41)},
  {...base,start_date:'invalid'}, {...base,start_date:'2030-01-02',end_date:'2030-01-01'},
]) check(!!validateBanner(input).error,'invalid content rejected');
check(!!validateBanner({...base,title:'a'.repeat(100),description:'a'.repeat(500),cta_label:'a'.repeat(40),link_url:'/dashboard',start_date:'2030-01-01',end_date:'2030-01-02'}).data,'boundary lengths and schedule allowed');
console.log('PASS '+checks+' banner content/link/schedule checks');
