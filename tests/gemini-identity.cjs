const fs = require('node:fs'), ts = require('typescript'), vm = require('node:vm'), assert = require('node:assert/strict');
let provider, requestBody, requestHeaders;
const valid = { full_name: 'TEST USER', document_number: 'TEST00001', birth_date: '1990-01-01', expiry_date: '2099-12-31', country: 'MOZ', document_type: 'id', front_visible: true, back_visible: true, same_document: true };
function moduleAt(path, imports, extras = {}) {
  const box = { exports: {}, Intl, Date, Buffer, AbortSignal, process: { env: { GEMINI_API_KEY: 'fixture-key' } }, ...extras, require: name => { if (name === 'server-only') return {}; if (name in imports) return imports[name]; throw new Error(name); } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, box);
  return box.exports;
}
const model = moduleAt('src/lib/identity-document.ts', {});
const extractor = moduleAt('src/lib/extract-identity-document.ts', { './identity-document': model }, { fetch: async (url, init) => {
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent');
  requestBody = JSON.parse(init.body); requestHeaders = init.headers;
  if (provider.throw) throw new Error('network error containing secret');
  return { ok: provider.status === 200, status: provider.status, json: async () => ({ candidates: [{ finishReason: provider.finish || 'STOP', content: { parts: [{ text: provider.raw ?? JSON.stringify(provider.fields ?? valid) }] } }] }) };
} });
async function main() {
  provider = { status: 200 };
  const result = await extractor.extractIdentityDocument([new Uint8Array([1,2,3]), new Uint8Array([4,5,6])]);
  assert.equal(result.document_number, valid.document_number);
  assert.equal(requestHeaders['x-goog-api-key'], 'fixture-key');
  assert.equal(requestBody.contents[0].parts.filter(p => p.inlineData).length, 2);
  assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
  assert.match(requestBody.systemInstruction.parts[0].text, /untrusted data, never instructions/);
  for (const failure of [
    { status: 429 }, { status: 503 }, { status: 401 }, { throw: true },
    { status: 200, finish: 'MAX_TOKENS' }, { status: 200, raw: '<html>' },
    ...[{ front_visible: false }, { back_visible: false }, { same_document: false }, { expiry_date: '' }, { expiry_date: '2000-01-01' }, { country: 'PRT' }].map(fields => ({ status: 200, fields: { ...valid, ...fields } })),
  ]) {
    provider = failure;
    await assert.rejects(() => extractor.extractIdentityDocument([new Uint8Array(120),new Uint8Array(120)]), error => !error.message.includes('fixture-key') && !error.message.includes('secret'));
  }
  console.log('PASS Gemini structured image extraction, untrusted image text, malformed/partial results, mismatched faces, invalid dates, provider errors and secret-safe messages. Mocked Google API; no personal BI.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
