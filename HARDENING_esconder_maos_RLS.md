# 🔒 Esconder as cartas dos adversários (RLS) — ✅ APLICADO (pronto para produção)

Estado: **aplicado no código e na migração**. Falta só (1) correr a migração no Supabase,
(2) garantir a `SUPABASE_SERVICE_ROLE_KEY` no Vercel, (3) deploy, e (4) o playtest de
recolha de feedback (quando tiveres alguém para testar).

---

## O que foi feito

**Problema:** `games` / `game_players` / `game_moves` não tinham RLS. O cliente fazia
`select('*')` em `game_players` e recebia a coluna `hand` (a mão) de TODOS — dava para ler
as cartas dos adversários (via REST direto ou pelo WebSocket do realtime).

**Solução aplicada (blast-radius mínimo graças à exceção "waiting"):**

1. **Migração `103_hide_opponent_hands_rls.sql`**
   - Função `get_table_state(game_id)` (SECURITY DEFINER): devolve o estado público de todos
     os jogadores + a mão SÓ do próprio utilizador (`hand`) e o nº de cartas dos restantes
     (`hand_count`).
   - RLS ligado nas 3 tabelas.
   - Políticas de SELECT:
     - **games:** participa na mesa, é host, OU a mesa está `waiting` (lobby).
     - **game_players:** a SUA linha SEMPRE; as dos outros só enquanto `waiting` (ainda sem
       cartas). Em `playing`, só a própria → mãos protegidas.
     - **game_moves:** quem participa na mesa (cartas já jogadas são públicas).
   - Sem políticas de INSERT/UPDATE/DELETE → escritas só via RPCs `SECURITY DEFINER`
     (`process_*`) e service role.

2. **Servidor / watchdog passam a usar a service role** (ignora RLS) — Passo 2:
   - `src/app/api/games/tick/route.ts` → service role.
   - `src/features/game/actions.ts`: `autoPlayForPlayer`, `playTimeoutCard`,
     o fetch de `game_over` em `playCard`, e `dealCardsForGame` → `createServiceClient()`.
   - `src/features/global-chat/actions.ts` (contagem de jogos) e
     `src/app/admin/actions.ts` (contagem total de jogos) → service role.

3. **Cliente lê pelo `get_table_state`** — Passo 3:
   - `src/app/dashboard/play/[gameId]/page.tsx`: estado inicial via RPC.
   - `src/features/game/game-table.tsx`: o refetch do realtime usa `get_table_state`; o
     evento da tabela `games` (muda a cada jogada) dispara o refresh; os adversários são
     desenhados por `hand_count`.

Resultado: a mão dos adversários **deixa de sair do servidor** — nem pela API REST, nem pelo
realtime, nem no estado do React. Só vês a tua mão; dos outros vês o número de cartas.

---

## Como pôr em produção (3 passos)

1. **Correr a migração** no Supabase (SQL Editor ou `supabase db push`):
   `supabase/migrations/103_hide_opponent_hands_rls.sql`.
2. **Confirmar a variável `SUPABASE_SERVICE_ROLE_KEY`** nas Environment Variables do **Vercel**
   (Project → Settings → Environment Variables). Sem ela, o watchdog e as leituras de servidor
   deixam de funcionar com RLS. (No código já é usada via `src/lib/supabase/service.ts`.)
3. **Deploy** normal do Next no Vercel.

> Ordem segura: faz deploy do código **antes ou ao mesmo tempo** que corres a migração. O código
> novo funciona com ou sem RLS; a migração é que liga a proteção.

---

## ✅ Checklist de playtest (para recolher feedback)

1. **Treino vs bots** (sem realtime) — deve continuar igual.
2. **Lobby** — criar mesa, ver mesas abertas, ver lugares a encher, entrar e convidar amigos.
3. **Mesa real com 4 jogadores** (ou 1 conta + 3 browsers anónimos):
   - vês a TUA mão; os adversários aparecem como cartas viradas (nº certo de cartas);
   - as jogadas dos adversários aparecem ao vivo (via evento de `games`);
   - o marcador, o trunfo e o resultado/prémio no fim ficam corretos.
4. **Teste de fuga (o mais importante):** com a mesa em `playing`, abre o DevTools →
   **Network/WS** e a aba de estado do React. Confirma que **NÃO** aparecem as cartas dos
   adversários em lado nenhum. Tenta também, com a tua sessão, chamar diretamente
   `…/rest/v1/game_players?select=user_id,hand&game_id=eq.<id>` — deve devolver só a tua linha.
5. **AFK / watchdog:** deixa um jogador parado >30s e confirma que o watchdog joga por ele.
   (Se travar, é sinal de que a `SUPABASE_SERVICE_ROLE_KEY` não está no Vercel.)

---

## Notas / limitações conhecidas
- **Sala de espera:** quando entra o 2.º/3.º jogador, a mesa ainda está `waiting`, por isso os
  lugares atualizam ao vivo. O início do jogo (4.º jogador) dispara um evento de `games` que
  sincroniza todos. Tudo funciona; só não há animação intermédia especial.
- **Convite + distribuição:** o `process_join_game` (migração 099) já distribui as cartas dentro
  da transação quando entra o 4.º jogador; o `dealCardsForGame` no fluxo de convite mantém-se
  (agora com service role) como estava. Não é um problema novo introduzido aqui.

## Rollback (se necessário)
```sql
DROP POLICY IF EXISTS games_select        ON public.games;
DROP POLICY IF EXISTS game_players_select ON public.game_players;
DROP POLICY IF EXISTS game_moves_select   ON public.game_moves;
ALTER TABLE public.games        DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_players DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_moves   DISABLE ROW LEVEL SECURITY;
```
O código novo (service role / get_table_state) continua a funcionar mesmo com RLS desligado,
por isso o rollback do SQL é suficiente para voltar ao comportamento anterior.
