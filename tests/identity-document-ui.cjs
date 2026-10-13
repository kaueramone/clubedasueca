const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const jsx = (type, props) => ({ type, props });
const fields = { full_name: 'TEST USER', document_number: 'TEST00001', birth_date: '1990-01-01', expiry_date: '2099-01-01', country: 'MOZ', document_type: 'id' };
const photo = new File([new Uint8Array(120)], 'fixture.jpg', { type: 'image/jpeg' });
const record = { ...fields, revision: 'fixture-revision', submitted_at: '2026-10-13T10:00:00Z', expired: false, front_url: 'https://example.invalid/front', back_url: 'https://example.invalid/back' };
let state = [null, false, false, '', '', photo, photo, true], index = 0;
const calls = [];
const source = ts.transpileModule(fs.readFileSync('src/components/dashboard/identity-document.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const box = { exports: {}, URL, FormData, AbortController, Date, fetch: async (url, options) => {
  calls.push([options?.method || 'GET', url, options?.body]);
  if (options?.method === 'POST') return { ok: true, json: async () => ({ saved: true }) };
  return { ok: true, json: async () => ({ document: record }) };
}, require(name) {
  if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx, Fragment: 'fragment' };
  if (name === 'react') return { useCallback: fn => fn, useEffect() {}, useRef: value => ({ current: value }), useState: initial => { const i = index++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; } };
  if (name.endsWith('/card')) return { Card: 'card' };
  if (name.endsWith('/button')) return { Button: 'button' };
  if (name.endsWith('/identity-camera')) return { IdentityCamera: 'camera' };
  if (name === '@/lib/identity-document') return { BI_CONSENT_VERSION: 'bi-storage-gemini-2026-10-13', DOCUMENT_TYPES:{id:'BI',passport:'Passaporte'} };
  if (name === '@/lib/prepare-identity-photos') return { prepareIdentityPhotos: async () => { calls.push(['PREPARE']); return [photo, photo]; } };
  throw new Error(name);
} };
vm.runInNewContext(source, box);
function walk(node, result = []) { if (!node || typeof node !== 'object') return result; if (Array.isArray(node)) { node.forEach(n => walk(n, result)); return result; } result.push(node); walk(node.props?.children, result); return result; }
async function main() {
  const nodes = walk(box.exports.IdentityDocument({}));
  const button = nodes.find(n => n.type === 'button' && n.props.children === 'Salvar documento');
  assert.ok(button && !button.props.disabled);
  assert.equal(nodes.filter(n => n.type === 'button' && /Ler dados|Confirmar dados/.test(n.props.children)).length, 0);
  await button.props.onClick();
  assert.deepEqual(calls.map(c => c[0]), ['PREPARE', 'POST', 'GET']);
  const form = calls.find(c => c[0] === 'POST')[2];
  assert.equal(form.get('consent'), 'bi-storage-gemini-2026-10-13');
  assert.equal(form.get('fields'), null); // Client cannot supply extracted data.
  assert.ok(form.get('front') instanceof File && form.get('back') instanceof File);
  index = 0;
  const savedNodes = walk(box.exports.IdentityDocument({}));
  assert.equal(savedNodes.filter(n => n.type === 'img' && /BI guardado/.test(n.props.alt)).length, 2);
  assert.ok(savedNodes.some(n => n.type === 'dd' && n.props.children === fields.document_number));
  assert.equal(state[5], null); assert.equal(state[6], null);
  console.log('PASS one-click BI flow: read → save both attachments and fields → reload saved images and fields. Mocked image preparation/API; no personal BI.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
