const fs = require('node:fs'), vm = require('node:vm'), ts = require('typescript'), assert = require('node:assert/strict');
const compile = path => ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
const modelBox = { exports: {} }; vm.runInNewContext(compile('src/lib/identity-camera.ts'), modelBox);
const model = modelBox.exports;
function walk(node) { return !node || typeof node !== 'object' ? [] : Array.isArray(node) ? node.flatMap(walk) : [node, ...walk(node.props?.children)]; }
function mount() {
  let index = 0, refIndex = 0, effect, resolve, stops = 0, captured, closed = 0;
  const state = [], refs = [], events = new Map(), draws = [];
  const player = { videoWidth: 1920, videoHeight: 1080, play: async () => {}, srcObject: null, getBoundingClientRect: () => ({width:360,height:450}) };
  const modal = { showModal(){}, close(){}, addEventListener(type, fn){events.set(type,fn)}, removeEventListener(type){events.delete(type)} };
  const box = { exports: {}, navigator: { mediaDevices: { getUserMedia: options => { assert.equal(options.audio,false); assert.equal(options.video.facingMode.ideal,'environment'); return new Promise(r => {resolve=r}); } } }, File, Blob, Error, HTMLElement: class {},
    document: { activeElement: null, hidden:false, addEventListener(type, fn){events.set(type,fn)}, removeEventListener(type){events.delete(type)}, createElement: () => ({getContext: () => ({drawImage: (...args) => draws.push(args)}),toBlob: fn => fn(new Blob(['synthetic camera frame'],{type:'image/jpeg'}))}) },
    require(name) {
      if(name==='react') return {useEffect: fn => {effect=fn},useRef: value => refs[refIndex++] ||= {current:value},useState: initial => {const i=index++; if(!(i in state))state[i]=initial;return[state[i],v=>{state[i]=v}]} };
      if(name==='react/jsx-runtime') return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
      if(name.endsWith('/button')) return {Button:'button'};
      if(name.endsWith('/identity-camera')) return model;
      throw new Error(name);
    }
  };
  vm.runInNewContext(compile('src/components/dashboard/identity-camera.tsx'),box);
  const render = () => {index=0;refIndex=0;return walk(box.exports.IdentityCamera({side:'front',onCapture:file=>{captured=file},onClose:()=>{closed++}}))};
  const nodes=render(); refs[0].current=modal;refs[1].current=player;refs[2].current={getBoundingClientRect:()=>({width:309.6,height:195.2})};
  const cleanup=effect();
  return { render, nodes, cleanup, player, events, draws, get captured(){return captured},get stops(){return stops},get closed(){return closed}, async connect(){resolve({getTracks:()=>[{stop(){stops++}}]});await Promise.resolve();await Promise.resolve()} };
}
async function main() {
  for(const [vw,vh,w,h] of [[1920,1080,360,450],[1080,1920,360,450],[1920,1080,700,320]]) {
    const crop=model.cameraCrop(vw,vh,w,h,w*.86,w*.86/1.586);
    assert.ok(crop.x>=0 && crop.y>=0 && crop.x+crop.width<=vw && crop.y+crop.height<=vh);
    assert.ok(Math.abs(crop.x+crop.width/2-vw/2)<.01); // Same centre as object-fit cover.
  }
  assert.throws(()=>model.cameraCrop(0,1080,360,450,300,190));
  const m=mount();await m.connect();assert.ok(m.player.srcObject);
  m.nodes.find(n=>n.type==='video').props.onLoadedData();
  await m.render().find(n=>n.type==='button' && n.props.children==='Capturar fotografia').props.onClick();
  assert.equal(m.captured.type,'image/jpeg');assert.equal(m.captured.name,'bi-front.jpg');assert.equal(m.draws.length,1);assert.equal(m.closed,1);
  m.cleanup();assert.equal(m.stops,1);assert.equal(m.player.srcObject,null);assert.equal(m.events.size,0);
  const pending=mount();pending.cleanup();await pending.connect();assert.equal(pending.stops,1);assert.equal(pending.player.srcObject,null); // Permission resolves after closing.
  const hidden=mount();await hidden.connect();hidden.events.get('cancel')({preventDefault(){}});assert.equal(hidden.closed,1);hidden.cleanup();
  console.log('PASS camera guide crop in portrait/landscape, rear camera without microphone, JPEG capture, close/Escape cleanup and late permission cleanup. Synthetic camera only.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
