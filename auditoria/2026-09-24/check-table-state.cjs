// Deterministic local integration checks; no network or player data.
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function load(name) {
  const code = ts.transpileModule(fs.readFileSync(`src/features/game/${name}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const sandbox = { exports: {}, require: name => load(name.replace('./', '')) };
  vm.runInNewContext(code, sandbox);
  return sandbox.exports;
}
const u = load('utils');
const t = load('table-state');
const deck = u.generateDeck();
let state = { id:'training', status:'playing', stake:0, current_turn:0, current_trick_cards:[], rounds:[], trump_card:deck[39], score_a:0, score_b:0, game_players:[0,1,2,3].map(position => ({user_id:String(position),position,team:position%2?'B':'A',hand:deck.slice(position*10,position*10+10),profiles:{username:String(position)}})) };
assert.equal(t.trainingMove(state,'1',deck[10]),state,'reject wrong turn');
assert.equal(t.trainingMove(state,'0','clubs-A'),state,'reject absent card');
for (let trick=0; trick<10; trick++) {
  for (let move=0; move<4; move++) {
    const player=state.game_players.find(p=>p.position===state.current_turn);
    const lead=state.current_trick_cards[0]?.card;
    const card=player.hand.find(c=>u.isValidMove(c,player.hand,lead?u.getCardSuit(lead):null));
    state=t.trainingMove(state,player.user_id,card);
    assert.equal(t.trainingMove(state,player.user_id,card),state,'late duplicate does nothing');
    state=JSON.parse(JSON.stringify(state)); // reload at every move, including full trick
  }
  state=t.settleTrainingTrick(state);
  assert.equal(t.settleTrainingTrick(state),state,'settlement is idempotent');
}
assert.equal(state.status,'finished');
assert.equal(state.rounds.length,10);
assert.equal(state.score_a+state.score_b,120);
assert.ok(state.game_players.every(p=>p.hand.length===0));
const snapshot=t.tableFromSnapshot({game:{...state,status:'finished',score_a:40,score_b:80,winner_team:'B',turn_deadline:'2026-09-24T10:00:30Z'},players:state.game_players.map((p,i)=>({...p,hand:i===1?['hearts-A']:[],card_count:1}))});
assert.equal(snapshot.winner_team,'B');
assert.equal(snapshot.score_b,80);
assert.equal(snapshot.game_players[0].hand.length,0);
assert.equal(snapshot.game_players[0].hand_count,1);
assert.equal(t.secondsToDeadline(snapshot.turn_deadline,Date.parse('2026-09-24T10:00:25Z')),5);
assert.equal(t.secondsToDeadline(snapshot.turn_deadline,Date.parse('2026-09-24T10:00:40Z')),0);
console.log('PASS: 40 moves, reload recovery, turn/ownership guards, duplicate settlement, score conservation, snapshot projection and absolute deadline.');
