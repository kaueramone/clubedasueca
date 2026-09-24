# Auditoria — Clube da Sueca / ApostaNaSueca

Data: 24/09/2026. Código local: commit `d393f32`, incluindo ficheiros locais não versionados presentes no início da auditoria. Ambiente público observado: https://clubedasueca.co.mz. A correspondência integral entre este código e o deploy não foi confirmada.

## Decisão executiva

**Manter como beta com créditos fictícios, corrigir os bloqueadores abaixo antes de aumentar a aquisição e não aprovar tecnicamente a passagem a dinheiro real nesta condição.** A ausência de gateway e a licença pendente são condições conhecidas desta fase, não defeitos por si mesmas. Os problemas encontrados estão na integridade dos acessos, no funcionamento do jogo e suporte e na diferença entre o que a plataforma promete e o que entrega.

O aviso de simulação que o responsável informa existir na área de pagamentos é uma premissa desta auditoria. Não tive sessão autenticada para confirmar a sua apresentação no ambiente publicado. No código local, “FICTÍCIO” aparece em comentários dos componentes; há um botão “Simular Confirmação de Transação”, mas não encontrei nesses componentes aviso visível sobre a reposição dos saldos no lançamento. A LP pública anuncia prémios e saldo reais. Portanto, **um aviso localizado, mesmo que exista no deploy, não torna coerente o percurso completo**.

Há bases úteis: demonstração sem registo, regras de naipes e pontuação, jogadas SQL com bloqueio transacional, distribuição no quarto ingresso, separação das mãos adversárias via RPC/RLS, histórico e estrutura de atendimento. Não é necessário abandonar o projeto; é necessário estabilizar estas bases antes de expandir funcionalidades.

## O que foi efetivamente auditado

- Mapeamento estrutural de 108 ficheiros de código com graphify; leitura dirigida de interface, autenticação, carteira, jogo, suporte, administração, afiliados, privacidade e migrações SQL. SQL revisto manualmente: o extrator não tinha o parser SQL instalado. Grafo estrutural sem extração semântica por LLM; custo de tokens LLM de extração: zero.
- Navegação pública: LP, registo e demonstração. Na demonstração: inatividade inicial, seleção e confirmação de carta, resposta dos três bots e explicação de uma vaza. Inspeção móvel a 360 × 800; a primeira leitura da LP e demo ocorreu no tamanho normal do navegador.
- Verificação TypeScript, comando de lint, auditoria de dependências de produção e quatro pedidos HTTP públicos sem autenticação.
- Testes locais das funções TypeScript de regras: casos dirigidos e 1.000 partidas simuladas; verificação dos 40 recursos gráficos das cartas.

**Não executado:** criação de conta, mensagens ao atendimento, depósitos/levantamentos, alterações administrativas, exploração de vulnerabilidades no ambiente público, partida multiplayer com quatro contas, inspeção dos dados reais, consulta das permissões SQL instaladas, testes de carga, testes em redes moçambicanas ou medição de Core Web Vitals. Não existe `.env.local` neste workspace. Não há fundamento para atribuir uma nota Lighthouse, SLA real ou taxa de conversão.

Nenhum código da aplicação foi alterado. Os ficheiros desta auditoria e o grafo são os únicos novos artefactos do trabalho.

### Como ler as prioridades

- **P0:** integridade/acesso; tratar antes de alargar o beta, confirmando primeiro a exposição no deploy.
- **P1:** quebra do percurso principal, confiança ou condição necessária para lançamento.
- **P2:** melhoria importante de operação, aquisição ou manutenção.
- **Ao vivo:** reproduzido no navegador. **Código:** demonstrável no repositório. **A confirmar:** depende da configuração ou de validação com contas.

## 1. Segurança, integridade e privacidade

### A01 — P0 — Funções privilegiadas confiam na identidade enviada pelo chamador

**Evidência: código; exposição instalada a confirmar.** `supabase/migrations/102_rake20_mzn_limits.sql:23` e `:71`: depósitos e levantamentos são `SECURITY DEFINER` e usam `p_user_id` sem comparar com `auth.uid()`. `098_process_play_card.sql:52` aceita `p_acting_user_id` sem autenticar essa identidade. Há concessão explícita de execução a `authenticated` para a jogada. `105_fix_draw_rake_audit_and_audit_insert_policy.sql:27` aceita pontuações fornecidas e encerra uma mesa ativa, sem exigir que o encerramento venha do motor da partida.

**Impacto:** dependendo dos grants instalados, alguém pode tentar movimentar carteira de outra pessoa, jogar em seu nome ou encerrar uma partida com resultado escolhido. Validar o utilizador na Server Action não protege uma RPC diretamente acessível. Bloqueios transacionais impedem algumas corridas, mas não autorizam o chamador.

**Correção:** identificar o utilizador dentro da função; separar operações internas do watchdog das chamadas de jogador; retirar execução pública de distribuição/encerramento/administração; fixar `search_path`; validar entrada e estado. Inventariar também criação, ingresso, cancelamento, bónus e comissões. O PostgreSQL concede execução a `PUBLIC` por defeito em funções novas, pelo que um `GRANT ... TO authenticated` isolado não revoga esse acesso [documentação PostgreSQL](https://www.postgresql.org/docs/18/sql-createfunction.html).

**Aceitação:** em base isolada, anónimo e conta A não conseguem alterar conta B; parâmetros de identidade falsos são rejeitados; só o motor encerra partidas; invariantes de saldo e livro de transações permanecem iguais após cada tentativa recusada.

### A02 — P0 — Redistribuição de cartas pode ser chamada fora do início da partida

**Evidência: código.** `supabase/migrations/099_deal_in_join.sql:14`: `deal_cards_for_game` verifica a existência de quatro jogadores, mas não autentica o chamador nem limita a transição inicial; volta a escrever mãos, pontos e turno. Tem `GRANT EXECUTE ... TO authenticated` na linha 63.

**Impacto:** redistribuição durante uma partida, perda de integridade e desacordo entre cartas já jogadas e mãos novas.

**Correção/aceitação:** função interna, chamada apenas na transição atómica de espera para jogo; segunda distribuição recusada; teste concorrente do quarto ingresso com uma única distribuição e 40 cartas únicas.

### A03 — P0 — Atualização do próprio perfil não protege o campo de administrador

**Evidência: código; grants/colunas instalados a confirmar.** `src/lib/supabase/schema.sql:118` permite atualizar a própria linha. `supabase/admin_schema.sql:1` acrescenta `role` e `is_banned` à mesma tabela. Não encontrei revogação de atualização dessas colunas nem trigger que preserve campos privilegiados.

**Impacto:** se o papel autenticado tiver UPDATE dessas colunas, a política de linha permite tentar promover o próprio perfil. A política adicional para administradores não restringe a política já existente.

**Correção/aceitação:** separar perfil editável e autoridade administrativa ou conceder UPDATE apenas a colunas permitidas; provar com duas contas que o utilizador não consegue alterar `role`, `is_banned` nem estados de verificação.

### A04 — P0 — Fronteira insegura nas ações de servidor do jogo

**Evidência: código.** `src/features/game/actions.ts:57`: `playCard` ignora a resolução do utilizador quando recebe `actingUserId`. `:196` e `:239`: helpers exportados `autoPlayForPlayer` e `dealCardsForGame` usam service role sem controlo próprio de autorização; o primeiro não verifica o prazo do turno internamente.

**Correção:** mover helpers para módulo exclusivamente interno, manter ações públicas autenticadas e verificar timeout atomicamente no servidor. Confirmar quais exports existem no build implantado; não assumir que todos os helpers não utilizados são expostos, porque o build pode eliminá-los. A ação `playCard`, efetivamente importada pela interface, precisa de proteção independentemente dessa otimização [segurança de Server Actions](https://nextjs.org/docs/app/guides/data-security).

### A05 — P1 — Dados pessoais misturados com perfis públicos e presença

**Evidência: código; acesso efetivo a confirmar.** A política SELECT de `profiles` é `USING (true)` (`schema.sql:116`); migrações 070 e 085 acrescentam nome completo, nascimento, nacionalidade e email. `src/components/dashboard/user-presence.tsx` envia email no canal `online-users` e regista eventos de presença no console.

**Correção/aceitação:** perfil público com apenas alcunha/avatar; dados pessoais em estrutura privada; presença sem email. Testar anónimo, outro jogador e administrador com uma matriz de campos permitidos, sem consultar dados reais para provar a falha.

### A06 — P1 — Banimento e idade são declarados, mas não aplicados no percurso principal

**Evidência: código.** `is_banned` aparece no comando e na apresentação administrativa, mas não encontrei validação nos fluxos de login, criação/ingresso em mesa ou RPCs analisadas. `src/app/auth/actions.ts:82` recolhe nascimento sem calcular idade; o trigger 085 aceita data nula após erro de conversão. O registo não apresenta um controlo específico de maioridade.

**Correção/aceitação:** política de elegibilidade no servidor e nas mutações; proibir ações de contas bloqueadas e idade abaixo da política anunciada, inclusive via API direta. Nacionalidade não é geolocalização nem residência autorizada. Esta observação é técnica, não uma conclusão sobre os requisitos da licença.

### A07 — P1 — Endpoint do bot aceita chamadas sem autenticação

**Evidência: código.** `src/app/api/community/respond/route.ts`: o formato antigo `{message,userId}` não verifica segredo nem sessão. O formato webhook só verifica segredo se configurado. Ambos podem gerar resposta paga do modelo e publicar como bot com service role.

**Correção/aceitação:** retirar formato legado ou autenticá-lo; segredo obrigatório para webhook, validar origem/estrutura, limite de tamanho/frequência e deduplicação por mensagem. Pedidos sem credencial recusados antes da chamada ao modelo. Não foi enviado pedido exploratório ao endpoint.

### A08 — P1 — Segredo no código e dependências com alertas

`src/app/auth/actions.ts:12` contém segredo Turnstile literal. Mover para variável de ambiente e rodar o segredo; não reproduzir o valor em tickets ou relatórios.

`npm audit --omit=dev --json`, executado nesta data, devolveu **6 pacotes com alertas: 1 crítico, 4 altos e 1 moderado**. O pacote `next` recebe criticidade agregada crítica; outros: `baseline-browser-mapping`, `nanoid`, `postcss`, `sharp`, `ws`. Fonte integral: `npm-audit.json` nesta pasta, com URLs dos avisos.

É um resultado do verificador sobre as versões locais, não prova de exploração nem de aplicabilidade de cada aviso ao deploy Vercel. Atualizar de forma controlada, cruzar cada condição com a infraestrutura e repetir testes de autenticação, imagens, ações e jogo. Não aplicar `audit fix --force` indiscriminadamente.

## 2. Jogo, usabilidade e consistência funcional

### A09 — P1 — Estado multiplayer não alimenta corretamente a apresentação

**Evidência: código; reprodução com quatro contas pendente.** O SQL guarda `score_a`, `score_b`, `trump_suit`, `winner_team` e movimentos em `game_moves`. `src/features/game/game-table.tsx:787` renderiza o estado local `scores`, alterado pelo percurso de treino. O componente espera `trump_card` e `current_trick_cards` para trunfo e cartas na mesa, mas a página `[gameId]/page.tsx` entrega linha de `games` e jogadores, sem adaptar/carregar movimentos. A subscrição não acompanha `game_moves`. `setGameResult` é alimentado no encerramento local de treino, sem equivalente encontrado para `status='finished'` online.

**Impacto esperado:** jogadas no servidor sem representação completa da vaza, placar e fim de jogo na interface. Isso impede confiar no multiplayer apenas porque o motor SQL funciona.

**Correção/aceitação:** contrato explícito de estado público da mesa; snapshot inicial e após reconexão com vaza, trunfo, pontos, jogador atual, deadline e resultado. Quatro contas devem ver os mesmos factos após cada jogada e após reload no meio de uma vaza, sem receber mãos alheias.

### A10 — P1 — Cartas cortadas em 360 px

**Ao vivo:** na mão de dez cartas, medi a primeira imagem com limite direito de −7,8 px e a última com início em 367,8 px, num viewport de 360 px. Estavam totalmente fora da largura visível. Outras cartas estavam parcialmente cortadas. Screenshot `mesa-mobile-360.png` documenta o problema numa fase posterior com nove cartas.

**Causa:** largura fixa das cartas, sobreposição/abertura no hover, rotação e contentores `overflow-hidden`; `max-w-[95vw]` não garante que os filhos caibam. `game-table.tsx:655` e `:907`.

**Aceitação:** 10 cartas identificáveis e selecionáveis em 320, 360, 390 e 412 px, retrato e paisagem; sem depender de hover. Uma solução é calcular a sobreposição pelo espaço real e manter uma área de seleção acessível para cada carta.

### A11 — P1 — Primeiro timeout da demonstração fica nos 0 segundos

**Ao vivo:** a demonstração permaneceu com dez cartas, mesa vazia e timer em 0 durante observações separadas por vários minutos. O segundo toque numa carta permitiu jogar e os bots completaram a vaza. Logo, não era bloqueio integral do motor.

**Causa provável no código:** o efeito do timer (`game-table.tsx:235`) captura o callback/estado inicial de uma mão vazia; a distribuição altera a mão mas não as dependências que reiniciam o efeito. Evitar efeitos secundários dentro do atualizador de estado e usar estado atual/deadline para a jogada automática.

**Aceitação:** iniciar nova demo e não tocar; jogar exatamente uma carta ao fim do prazo, prosseguir até uma vaza válida. Repetir após restaurar progresso e alternar separador.

### A12 — P1 — Resultado assume equipa A e trata empate como derrota

**Código:** `src/features/game/components/game-result-overlay.tsx` usa `winnerTeam === 'A'` para “Vitória!”; qualquer outro valor, inclusive `Draw`, produz “Derrota!”. O placar chama sempre A de “Nós”.

**Aceitação:** jogadores de A e B veem vitória/derrota relativamente à sua equipa; empate tem mensagem, reembolso e taxa zero próprios. Testar explicitamente 60–60 e vitória de B, além do caso A.

### A13 — P1 — Reconexão e timeout precisam de um relógio único

**Código:** interface começa em 15 s; watchdog considera 30 s e o cron corre a cada minuto (`096_turn_watchdog.sql:72`). Sem o navegador a executar auto-play, uma ação pode ocorrer aproximadamente entre 30 e 90 s após o início do turno, antes de somar latência. Isso é cálculo do desenho, não latência medida.

A subscrição usa `.subscribe()` sem tratamento de recuperação que recarregue todo o snapshot e depende de `showChat`, recriando o canal ao abrir/fechar chat. Não encontrei reconciliação explícita após eventos perdidos. A verificação de timeout no handler ocorre antes do processamento; deve ser revalidada sob o mesmo bloqueio da jogada.

**Aceitação:** cortar ligação durante 10/30/60 s, retomar e recuperar estado; ninguém ganha novo prazo só por fazer reload; chamada atrasada do watchdog não joga pelo jogador seguinte antes do prazo; pedidos duplicados não removem duas cartas.

### A14 — P2 — Aprendizagem e acessibilidade do jogo

**Ao vivo/código:** são necessários dois toques — selecionar e confirmar — sem instrução inicial correspondente. Uma jogada inválida no treino termina silenciosamente. As cartas clicáveis são `div` com imagem (`game-table.tsx:655`), sem botão, foco ou teclado. Nomes acessíveis como `clubs-6` são IDs internos, não “6 de Paus”.

**Correção:** indicação “Toque para selecionar; toque novamente para jogar”, destaque de cartas legais, explicação de obrigação de assistir, botões com nomes em português e foco visível. A explicação da vaza já existente é um ponto forte e pode ser aproveitada no tutorial. Permitir treinar sem relógio antes do modo normal.

## 3. Suporte e operação

### A15 — P1 — Ticket confirma envio inexistente

**Código, confirmação inequívoca:** `src/app/dashboard/support/page.tsx:9` apenas cancela submit e executa `setSent(true)`. Não existe pedido ao servidor nem gravação. Exibe “Mensagem Enviada!”, promessa de email e “Tempo médio de resposta: 24 horas”.

**Impacto:** pedidos perdidos, equipa sem conhecimento e utilizador convencido de que está a aguardar resposta.

**Aceitação:** criar ticket com ID persistente, encontrá-lo no admin, responder, apresentar estado ao jogador e só mostrar sucesso após confirmação do backend. Se ainda não houver canal operacional, não apresentar um formulário funcional fictício.

### A16 — P1 — Chat tem resposta automática sem encaminhamento humano fiável

**Código:** `src/features/chat/actions.ts:113`: correspondência com FAQ responde e mantém `open`; mensagem posterior sem correspondência passa `isFollowUp=true`, impedindo o ramo que muda para `waiting_agent`. Assim a promessa de assistente humano não é acompanhada da transição esperada para a fila, embora um administrador ainda possa procurar conversas abertas. A resposta automática usa promessa não aguardada e atraso de 1,5 s; não há garantia de conclusão após a resposta do servidor.

**Aceitação:** “falar com pessoa” encaminha sempre; após resposta inadequada, nova pergunta chega à fila; ID, responsável, estado, horários e prazo esperado visíveis. Executar processamento durável/`after` conforme criticidade, com erros tratados. Não foi feita avaliação da qualidade ou rapidez de um atendente real.

### A17 — P1 — Política do chat permite adulterar o histórico da própria conversa

**Código; acesso instalado a confirmar:** `supabase/migrations/060_live_chat.sql` usa `FOR ALL` para mensagens da conversa própria sem limitar remetente, `is_bot`, UPDATE ou DELETE. É demasiado amplo para um histórico de reclamações.

**Correção/aceitação:** SELECT próprio; INSERT com remetente autenticado e `is_bot=false`; mensagens de sistema apenas por backend; utilizador não pode apagar/editar respostas de agente nem simular origem administrativa.

### A18 — P1 — Informações de pagamentos divergem entre canais

LP/página pública falam de dinheiro real e levantamento em até **2 horas úteis**; formulário e bot falam em **24 horas**. O bot promete depósitos instantâneos e pagamentos móveis, sem explicar o beta. A área de simulação pede telefone e apresenta “Confirme o PIN no seu telemóvel” sem gateway que envie a solicitação.

**Correção:** informação única por fase do produto. Durante o beta, “Adicionar créditos de teste” e “Sem cobrança”; não pedir número financeiro real sem necessidade, nem instruir autorização de pagamento inexistente. Informar claramente que não há levantamento real. Prazo futuro só deve ser publicado após acordo operacional e medição.

## 4. Carteira, contabilização e passagem ao lançamento

### A19 — P1 — Simulação e saldo futuro não têm separação explícita no modelo disponível

**Código:** a mesma carteira e os mesmos tipos de transação recebem os créditos simulados. Não encontrei um modo central obrigatório que bloqueie chamadas de simulação quando o produto muda para operação real. `process_deposit` credita o montante diretamente, o que é compatível com teste controlado, mas não com confirmação de pagamento futuro.

**Aceitação para lançamento:** livro de saldos de teste separado do real ou segregação inequívoca por ambiente/modo; backend recusa simulação em modo real; webhooks assinados e idempotentes; conciliação; estados pendente/confirmado/falhou/revertido; regras de retirada e fraude aprovadas para a operação concreta.

**Reset:** definir o que zera além da carteira: bónus, rollover, levantamentos pendentes, comissões e indicadores financeiros. Preservar contas conforme política acordada, arquivar trilho de teste e testar reconciliação antes/depois. Uma migração executada com plano e evidência é diferente de simplesmente apagar tudo. Não executei reset.

### A20 — P1 — Comissões podem existir em empate e ser duplicadas

**Código:** SQL 105 corretamente devolve entrada e regista taxa zero no empate. Porém, `src/features/game/actions.ts:135` calcula sempre `stake × 4 × 20%` e envia para comissão de afiliados, inclusive em empate. `020_affiliates.sql:242` usa o valor recebido, insere comissão e soma ao total, sem guarda de idempotência por partida/referral encontrada.

**Aceitação:** usar a taxa efetivamente registada; empate gera zero comissão; reprocessamento produz o mesmo saldo; tarefas de bónus/CRM/afiliados são duráveis, com retentativa e deduplicação. As promessas não aguardadas atuais podem perder efeitos secundários.

### A21 — P1 — Crédito de boas-vindas depende de condições frágeis

**Código:** `src/app/auth/actions.ts:103` procura utilizador autenticado imediatamente após signup; com confirmação de email ativa pode não haver sessão. Tenta `upsert` de carteira com cliente comum, mas a política local de wallets encontrada só permite SELECT próprio. Insere transação `type: 'credit'`, ausente no enum inicial do schema. Erros retornados pelo Supabase não são todos tratados, e a tarefa não é aguardada.

**Aceitação:** crédito fictício uma única vez, após a ativação definida, sem substituir saldo existente e com transação válida. Testar signup com/sem confirmação, reenvio de email e repetição de pedido. Confirmar schema efetivo antes de afirmar que estas incompatibilidades ocorrem no deploy.

### A22 — P2 — Taxa de 20% tem efeito comercial material

Pela regra implementada: quatro entradas de 100 créditos → pote 400 → taxa 80 → dupla recebe 320 → cada vencedor recebe 160, com **ganho líquido de 60**; cada perdedor perde 100. Em exemplo matemático sem empates, um jogador com 50% de vitórias tem expectativa de −20 créditos por partida; o equilíbrio exige 62,5% de vitórias. Isto ilustra a regra, não estima o desempenho de jogadores reais.

Chamar a taxa apenas de “pequena percentagem” dificulta compreender o produto. Mostrar entrada, taxa, prémio da dupla, prémio por jogador e ganho líquido antes de confirmar mesa. Testar compreensão e retenção no beta. Créditos gratuitos não validam disposição a pagar ou viabilidade comercial em dinheiro real.

## 5. LP e adequação a Moçambique

### A23 — P1 — Promessa pública não corresponde à fase nem às capacidades demonstradas

**Ao vivo:** “Clube Oficial”, “Tradicional Português”, “prémios reais”, “saldo real”, ranking, torneios e deteção de conluio. Não localizei motor de torneios/ranking/anticonluio que sustente essas promessas no código analisado. A regra de seguir naipe não é deteção de conluio. Sem prova, remover/reformular, em vez de apresentar como capacidade existente.

“Oficial” requer fundamento próprio; a licença pendente não foi verificada e não deve ser confundida com endosso. O domínio moçambicano e os meios móveis estão alinhados com o destino declarado, mas o texto e referências continuam centrados em Portugal. A decisão sobre tom deve ser validada com residentes, sem assumir que todos os públicos moçambicanos têm a mesma relação com a sueca.

**Texto proposto para o beta, sujeito à voz da marca:**

> Sueca online, com a tua equipa.
>
> Experimenta o Clube da Sueca em Moçambique. Joga uma demonstração sem conta ou participa nos testes com créditos gratuitos.
>
> **Fase de testes: sem dinheiro real. Os créditos não podem ser levantados e todos os saldos serão repostos a zero no lançamento oficial.**
>
> Botão principal: Experimentar grátis. Secundário: Criar conta de teste.

Explicar em três passos: experimentar → aprender/entrar com amigos → jogar com créditos de teste. Mostrar uma imagem real da mesa móvel já corrigida; esclarecer bots versus pessoas; indicar canal e horário de apoio. Substituir “FAQ Estratégico” por “Perguntas frequentes”. Manter +18 e regras acessíveis. Não prometer data de lançamento, licença obtida ou métodos contratados antes de estarem confirmados.

### A24 — P2 — Localização, aquisição e operação não estão medidas

`src/app/layout.tsx` usa `pt-PT` em `.co.mz`, apesar de metadados `pt_MZ`. Canonical/languages globais precisam de revisão por rota. Há terminologia misturada (saque/levantamento, prémios/prize pools, “Team A”), apresentação financeira 1:1 durante o beta e nome antigo no manifest. Registo começa com nome completo/data/nacionalidade/email e Portugal antes de Moçambique; avaliar fricção com pessoas reais sem remover dados necessários à elegibilidade.

**Contexto verificado:** Banco de Moçambique reporta 25,4 milhões de contas de moeda eletrónica no IV trimestre de 2025; contas não são pessoas únicas nem público disponível para o jogo [fonte](https://www.bancomoc.mz/pt/media/noticias/indicadores-de-inclusao-financeira-iv-trimestre-de-2025/). Isso dá suporte à escolha de pesquisar pagamentos móveis, não confirma que qualquer operador aceitará o negócio.

O INCM avaliou Tmcel, Vodacom e Movitel em 31 áreas, com tecnologias 2G/3G/4G, no levantamento de 2025 [fonte](https://www.incm.gov.mz/2026/09/10/disponivel-relatorio-de-afericao-de-qualidade-de-servico/). Recomendação derivada: validar o jogo em várias redes/dispositivos e locais; não generalizar a conectividade de Maputo para todo o país.

**Pesquisa proposta:** 8–12 adultos residentes, com diferentes dispositivos e redes, incluindo jogadores habituais e iniciantes. Tarefas: explicar o beta, começar demo, identificar parceiro/trunfo, jogar sem ajuda, perceber taxa e pedir apoio. Registar falhas, tempo e explicação nas próprias palavras; não apresentar esta amostra como representativa do país. Depois pilotar aquisição pequena com métricas, sem escalar publicidade sobre um percurso defeituoso.

**Funil a instrumentar:** visita → início da demo → primeira jogada válida → conclusão → registo → confirmação → primeira partida entre pessoas → regresso D1/D7. Medir tempo para quatro lugares, desistência na espera, desconexão, erros por partida, contactos e resolução. Sem analytics encontrado no código, não atribuo taxas atuais.

## 6. Desempenho e qualidade técnica

### A25 — P1 — Verificações de qualidade não passam

- `npx tsc --noEmit --incremental false`: falha em `src/features/game/actions.ts:376`, `TS2339: Property 'already_joined' does not exist on type 'never'`.
- `npm run lint`: falha; script chama `next lint` e a versão instalada interpreta `lint` como diretório inválido.
- `next.config.mjs` tem `typescript.ignoreBuildErrors: true`.

**Aceitação:** TypeScript e ESLint executáveis no CI, falhas bloqueiam integração e build. Remover bypass após corrigir tipos. Não executei build de produção: faltam variáveis locais e não seria evidência de funcionamento do backend instalado.

### A26 — P2 — Tempo de HTML razoável nesta amostra não prova experiência móvel

Quatro pedidos únicos, sequenciais, desta máquina, sem emulação nem cache controlada:

| Rota | HTTP | Primeiro byte | Total HTML | Bytes HTML |
|---|---:|---:|---:|---:|
| `/` | 200 | 0,431 s | 0,443 s | 52.078 |
| `/demo` | 200 | 0,401 s | 0,402 s | 33.540 |
| `/register` | 200 | 0,329 s | 0,329 s | 17.103 |
| `/p/deposito-saque` | 200 | 0,338 s | 0,338 s | 31.461 |

São medições de transporte HTML, não LCP, INP, CLS, consumo total ou desempenho em Moçambique. Não sustentam a promessa “100% de fluidez em qualquer smartphone”.

Recursos fonte: hero PNG 3.796.603 bytes; mesa horizontal 785.166; mesa vertical 876.928. Next/Image pode entregar versões otimizadas: estes tamanhos não são o tráfego real. Há imagens responsivas duplicadas no DOM e vários `fill` sem `sizes`; verificar os pedidos reais por viewport antes de quantificar poupança.

Riscos de escala: eventos de lobby amplos, consultas de jogadores por evento, atualização extra das mãos a cada jogada e execução sequencial do watchdog. Heartbeat: aproximadamente N/60 escritas por segundo para N utilizadores ligados, fora do tráfego do jogo. Não executei carga contra o ambiente público.

**Plano de medição:** build equivalente em staging; Android de entrada e rede móvel real; medições repetidas com cache frio/quente; RUM no p75; testes de 10/50/100 mesas em ambiente isolado. Metas internas propostas: LCP ≤2,5 s, INP ≤200 ms, CLS ≤0,1, jogada p95 ≤1 s numa rede de referência documentada, recuperação de snapshot ≤5 s após a ligação voltar. As metas são critérios propostos, não resultados atuais nem garantia em qualquer rede.

### A27 — P2 — PWA e documentação divergem da implementação

`public/manifest.json` conserva ApostaNaSueca, cores antigas e ícones `/icon-192x192.png` e `/icon-512x512.png` ausentes dos ficheiros públicos listados. Não encontrei ligação ao manifest nem registo de service worker no código. O README promete PWA, Next 14, euros e MB Way, apesar da implementação atual.

**Aceitação:** atualizar documentação para instalação/migrações atuais e decidir se PWA faz parte da entrega; se sim, validar manifest, ícones e instalação em dispositivos. Um manifest por si só não confirma suporte offline ou instalabilidade em todos os navegadores.

## 7. Matriz de validação para encerrar a auditoria operacional

### A28 — P1 — Histórico e gestão de levantamentos incompletos

**Código:** `src/app/dashboard/history/page.tsx` lista apenas transações, tem `TODO` para histórico de jogos e não pagina a consulta. O dashboard anuncia “Jogos e transações”. `src/app/admin/transactions/page.tsx` apresenta as últimas 50 transações sem controlo de aprovação/rejeição de levantamentos; não localizei esse fluxo no restante código administrativo. Além disso, compara tipo `withdraw`, enquanto o schema/RPC usa `withdrawal`, apresentando levantamentos como “Jogo”. A nota antiga de infraestrutura que descreve aprovação manual não prova a existência desta capacidade na aplicação atual.

**Aceitação:** histórico paginado com partida, equipa, pontuação, entrada, resultado e transação associada; fila administrativa de pedidos com estados, responsável, motivo, trilho e reembolso exatamente uma vez quando aplicável. Durante o beta, deixar explícito que a fila é de simulação, sem promessa de envio de dinheiro.

### A29 — P0 — RLS financeiro não está completo nos scripts disponíveis

**Código; estado instalado a confirmar:** o schema cria `transactions`, `withdrawals`, `house_revenue`, `support_tickets` e `support_messages`, mas não encontrei `ENABLE ROW LEVEL SECURITY` para essas tabelas em `src/lib/supabase/schema.sql` nem nos scripts `supabase/`. Criar uma política administrativa SELECT para transações sem ativar RLS não a torna restritiva.

**Impacto condicional:** com grants REST usuais e sem configuração adicional, dados e operações destas tabelas podem não estar isolados. A ausência nos scripts não prova ausência no projeto Supabase, mas impede reproduzir com segurança a base apenas a partir do repositório.

**Aceitação:** verificar flags RLS, políticas e grants no banco instalado; versionar o estado desejado; anónimo não lê dados privados; conta A só lê o seu histórico; alterações financeiras e de suporte respeitam caminhos autorizados. `database-readonly-checks.sql` contém consultas de catálogo, sem dados de jogadores, para esta confirmação.

| Percurso | Evidência atual | Teste necessário para aprovação |
|---|---|---|
| LP → demo | Executado; problemas móveis e timeout | Dez cartas acessíveis, instruções e timeout corretos |
| Demo: jogada e bots | Uma vaza observada; regras locais passaram | Partida completa, empate, reload e resultado |
| Registo/login/recuperação | UI pública + código | Contas controladas, confirmação/reenvio, recuperação, idade e banimento |
| Créditos fictícios | Código; aviso referido pelo responsável | Adicionar, repetir, validar limites, saldo e trilho sem dados financeiros reais |
| Criar/entrar/convidar | Código | Quatro contas; quinto ingresso; dois pedidos simultâneos |
| Partida online | Código; inconsistências encontradas | Dez vazas, mesmos pontos/cartas públicas, isolamento das mãos |
| Desconexão | Código | Rede interrompida, reload, turno expirado, reconciliação |
| Cancelamento/reembolso | Código | Antes/depois de ocupar lugares, concorrência, exatamente um reembolso |
| Suporte | Formulário sem envio; chat analisado | Ticket recebido, escalado, respondido e reaberto; medir atendimento real |
| Admin/RLS/RPC | Revisão estática | Matriz de permissões e tentativas negativas em base isolada |
| Bónus/afiliados | Riscos de entrega e duplicação | Vitória/derrota/empate, repetição, reset e conciliação |
| Pagamento real | Fora desta fase por decisão do responsável | Licença e prestador confirmados; integração certificada e conciliação |

## 8. Ordem de execução recomendada

**Primeiro — conter riscos e recuperar confiança:** verificar grants/RLS em cópia segura; corrigir A01–A08; tornar beta/reset inequívocos na LP, registo, carteira, bot e páginas; tornar tickets reais ou retirar a falsa confirmação. Responsáveis: backend/segurança + produto/apoio. Resultado: beta tecnicamente controlado e comunicação fiel.

**Segundo — estabilizar o jogo:** corrigir contrato multiplayer, mão móvel, relógio, reconexão e resultado; executar quatro contas e casos concorrentes. Responsáveis: frontend + backend + QA. Resultado: partidas completas com concordância de estado e saldos.

**Terceiro — medir a experiência local:** corrigir CI, instrumentar funil e erros, testar dispositivos/redes, conduzir sessões com residentes. Responsáveis: produto/QA/marketing. Resultado: decisões de aquisição sustentadas por comportamento observado.

**Quarto — preparar lançamento real quando houver condições externas:** prestador confirmado, separação de ambientes/saldos, teste do reset, KYC/elegibilidade/jogo responsável operacionalizados conforme exigências aplicáveis, reconciliação e resposta a incidentes. Responsáveis: operação/jurídico/backend/financeiro. Páginas de políticas não substituem procedimentos implementados.

Não foi emitido parecer jurídico nem validada a licença. Qualquer declaração de conformidade deve ser confirmada com quem conduz esse processo e com o prestador contratado. O critério técnico de saída é concreto: nenhum P0 pendente, percursos P1 aprovados com evidência, controlo de acesso e livro de saldos verificados, restauração testada e suporte capaz de receber e resolver pedidos.

## Artefactos e repetibilidade

- `check-rules.cjs` e `rules-results.json`: testes locais de regras, sem ligação ao backend.
- `http-measurements.jsonl`: medições HTTP desta sessão.
- `npm-audit.json`: resultado integral das dependências e referências dos avisos.
- `database-readonly-checks.sql`: consultas de catálogo para confirmar RLS/grants no Supabase; preparadas, não executadas.
- `mesa-mobile-360.png` e `landing-mobile-360.png`: evidências visuais.
- `../../graphify-out/graph.json`: mapa estrutural auxiliar. Não representa permissões instaladas, estado de produção nem substitui os achados acima.

Os bloqueios de acesso impedem declarar encerrada a validação operacional integral. Este relatório entrega a análise técnica e comercial executada, os defeitos comprovados e o roteiro exato da validação que falta, sem tratar hipóteses como incidentes ocorridos.
