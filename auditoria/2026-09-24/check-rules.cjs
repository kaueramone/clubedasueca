// Auditoria local: não liga ao Supabase nem altera contas ou partidas.
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync('src/features/game/utils.ts', 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const sandbox = { exports: {} };
vm.runInNewContext(compiled.outputText, sandbox);
const u = sandbox.exports;
const deck = u.generateDeck();
assert.equal(deck.length, 40);
assert.equal(new Set(deck).size, 40);
assert.equal(deck.reduce((s, c) => s + u.getCardValue(c), 0), 120);
for (const card of deck) assert.ok(fs.existsSync('public' + u.getCardAssetPath(card)), card);
const winner = cards => u.getTrickWinner(cards.map((card, i) => ({card, player_id: String(i)})), 'hearts');
assert.equal(winner(['clubs-2','clubs-6','clubs-4','clubs-3']), '1');
assert.equal(winner(['clubs-A','hearts-2','spades-A','diamonds-A']), '1');
assert.equal(winner(['hearts-K','hearts-7','hearts-A','hearts-J']), '2');
assert.equal(u.isValidMove('hearts-A', ['clubs-2','hearts-A'], 'clubs'), false);
assert.equal(u.isValidMove('hearts-A', ['hearts-A'], 'clubs'), true);
for (let simulation = 0; simulation < 1000; simulation++) {
  const shuffled = u.shuffleDeck(deck);
  assert.equal(new Set(shuffled).size, 40);
  const hands = [0,1,2,3].map(i => shuffled.slice(i*10,i*10+10));
  let first = 0, total = 0;
  const played = new Set();
  for (let trick = 0; trick < 10; trick++) {
    const cards = [];
    for (let turn = 0; turn < 4; turn++) {
      const player = (first + turn) % 4;
      const lead = cards.length ? u.getCardSuit(cards[0].card) : null;
      const valid = hands[player].filter(c => u.isValidMove(c,hands[player],lead));
      const card = valid[Math.floor(Math.random()*valid.length)];
      assert.ok(card);
      assert.ok(!played.has(card));
      played.add(card);
      hands[player].splice(hands[player].indexOf(card),1);
      cards.push({card,player_id:String(player)});
      total += u.getCardValue(card);
    }
    first = Number(u.getTrickWinner(cards,'hearts'));
    assert.ok(first >= 0 && first <= 3);
  }
  assert.equal(total,120);
  assert.equal(played.size,40);
  assert.ok(hands.every(h=>h.length===0));
}
console.log(JSON.stringify({result:'PASS', scope:'Regras TypeScript isoladas; não valida SQL, multiplayer, concorrência ou UI', simulations:1000, cardsPerGame:40, pointsPerGame:120, cardAssets:40},null,2));
