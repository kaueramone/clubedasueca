const $ = id => document.getElementById(id);
let core, session, busy = false;
function say(message) { $('status').textContent = message; }
function controls() {
  $('initialize').disabled = busy || !!core;
  $('capture').disabled = busy || !core;
  $('clear').disabled = busy || !core;
}
async function dispose() {
  if (session) { await session.delete(); session = undefined; }
  if (core) { await core.terminate(); core = undefined; }
}
function text(field) { return field?.latin?.value || field?.arabic?.value || ''; }
function date(field) {
  return field?.successfullyParsed && field.year && field.month && field.day
    ? `${String(field.day).padStart(2, '0')}/${String(field.month).padStart(2, '0')}/${field.year}`
    : text(field?.originalString) || 'Não lida';
}
async function imageData(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024)
    throw new Error('Use fotografias JPG, PNG ou WebP até 20 MB cada.');
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 2600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } finally { bitmap.close(); }
}
$('initialize').addEventListener('click', async () => {
  const key = $('license').value.trim();
  if (!key) return say('Introduza a licença de teste.');
  if (location.hostname !== 'clubedasueca.co.mz') return say('Abra este ensaio em https://clubedasueca.co.mz/ensaios/blinkid/index.html — a licença está vinculada a esse domínio.');
  busy = true; controls();
  try {
    say('A carregar o motor de leitura…');
    const { loadBlinkIdCore } = await import('./sdk/blinkid-core.js');
    core = await loadBlinkIdCore({
      licenseKey: key, resourcesLocation: new URL('./sdk/', location.href).href,
      useLightweightBuild: true, otaResources: { checkForUpdates: false },
    }, progress => say(`A carregar o leitor… ${Math.round(progress.progress)}%`));
    session = await core.createScanningSession(await core.buildDocumentPhotoSettings());
    $('license').value = '';
    say('Leitor inicializado e sessão criada. Pode fotografar a frente e o verso do BI.');
  } catch {
    await dispose().catch(() => {});
    say('Não foi possível iniciar o leitor. Confira o domínio, a licença e a ligação à Internet.');
  } finally { busy = false; controls(); }
});
$('read').addEventListener('click', async () => {
  const front = $('front').files[0], back = $('back').files[0];
  if (!front || !back || !$('consent').checked) return say('Escolha frente e verso e confirme a autorização para o ensaio.');
  busy = true; controls(); $('result-section').hidden = true; $('result').textContent = '';
  try {
    await session.reset();
    for (const [side, file] of [['frente', front], ['verso', back]]) {
      say(`A ler ${side}…`);
      const processed = await session.process(await imageData(file));
      if (processed.error) throw new Error('O leitor não conseguiu processar a fotografia.');
      const state = await session.getScanningStatus();
      if (state === 'document-scanned') break;
      if (state === 'side-scanned') await session.resolveCurrentStep();
    }
    const complete = await session.getScanningStatus() === 'document-scanned';
    const result = await session.getResult();
    const country = result.documentClassInfo?.isoAlpha3CountryCode || result.documentClassInfo?.country?.id || 'Não identificado';
    $('result').textContent = JSON.stringify({
      'Leitura': complete ? 'Concluída' : 'Incompleta — repita com fotografias mais nítidas',
      'País reconhecido': country,
      'Nome': text(result.fullName) || [text(result.firstName), text(result.lastName)].filter(Boolean).join(' ') || 'Não lido',
      'Número do documento': text(result.documentNumber) || 'Não lido',
      'Nascimento': date(result.dateOfBirth), 'Validade': date(result.dateOfExpiry),
      'Concordância entre faces (não comprova autenticidade)': result.dataMatchResult || 'Não avaliada',
      'Autenticidade': 'Não avaliada', 'Aprovação de conta': 'Não realizada',
    }, null, 2);
    $('result-section').hidden = false;
    say(complete ? 'Leitura concluída. Confira os campos abaixo.' : 'Leitura incompleta. Confira os campos e repita as fotografias.');
  } catch (error) { say(error instanceof Error ? error.message : 'Não foi possível ler o documento.'); }
  finally { busy = false; controls(); }
});
$('clear').addEventListener('click', async () => {
  busy = true; controls();
  try { await dispose(); } finally {
    $('license').value = ''; $('front').value = ''; $('back').value = ''; $('consent').checked = false;
    $('result').textContent = ''; $('result-section').hidden = true;
    busy = false; controls(); say('Dados do ensaio limpos. Leitor terminado.');
  }
});
window.addEventListener('pagehide', () => { void dispose().catch(() => {}); });
