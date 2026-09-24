# Correções da auditoria — 24/09/2026

As alterações estão no repositório, na branch `codex/audit-beta-hardening`. Não foram publicadas nem aplicadas ao Supabase instalado. Nenhum saldo foi apagado ou reposto. Este registo complementa [RELATORIO.md](RELATORIO.md); não substitui a validação operacional do ambiente publicado.

## Cobertura por achado

| Achado | Correção aplicada | Evidência e condição ainda necessária |
|---|---|---|
| A01 — Identidade nas RPCs | Identidade derivada de `auth.uid()`, elegibilidade, grants restritos, funções internas e autorização administrativa. | Testes PostgreSQL isolados de impersonação, grants e invariantes. Aplicar migrações 106–108 e conferir catálogo real. |
| A02 — Redistribuição | Distribuição interna, transição controlada de espera para jogo e recusa de redistribuição pública. | Testes locais de distribuição/40 cartas. Concorrência entre ligações e quatro clientes reais pendente. |
| A03 — Privilégios do perfil | RLS privada, campos editáveis restritos e operações administrativas controladas; administrador banido também perde autorização. | Testes SQL de promoção/bloqueio e políticas. Confirmar grants/políticas instalados. |
| A04 — Server Actions | Helpers privilegiados removidos da superfície pública e movidos para módulo server-only; timeout decidido no servidor. | Build, revisão de exports e testes SQL; ambiente real pendente. |
| A05 — Privacidade | Presença sem email; diretório `public_profiles` mínimo e `blog_authors` limitado a autores publicados. Consultas públicas migradas. | Matriz SQL local de acesso. Realtime instalado e restantes dados do CMS exigem validação. |
| A06 — Idade/banimento | Maioridade e banimento verificados no servidor e RPCs; aviso +18 no registo. | Tentativas SQL de menores/banidos recusadas. Percurso Auth real, confirmação e recuperação com contas controladas pendentes. |
| A07 — Bot | Endpoint legado retirado, segredo obrigatório, limites e deduplicação de mensagens. | Revisão e build; configurar segredo/webhook e testar frequência no staging, sem acionar modelo pago nesta validação. |
| A08 — Segredo/dependências | Segredo Turnstile passa a variável de ambiente; Next 16.3.6/React 19.3.0 e dependências atualizadas de forma compatível. | `npm audit` sem vulnerabilidades na execução final. A rotação do segredo exposto no fornecedor ainda deve ser executada; retirar do código não o invalida. |
| A09 — Estado multiplayer | Snapshot canónico alimenta mãos autorizadas, placar, trunfo, turno, vazas e vencedor. | Testes de projeção de snapshot e SQL. Quatro sessões simultâneas e eventos Realtime reais pendentes. |
| A10 — Cartas móveis | Mão reestruturada com área de navegação acessível em ecrãs estreitos; sobreposições e resultado com scroll. | Navegador local360×800: dez botões, última carta acessível por scroll, largura da página360px. Paisagem800×360 retestada com cartas44×62px, centro visível e sem overflow da página (estado em jogo; não todos os estados de recap). Repetir em Android real. |
| A11 — Timeout demo | Temporizador utiliza ação atual e transições de treino consistentes; recuperação de armazenamento local. | Testes de40 jogadas/10 vazas; demo completa no navegador após reload, resultado84–36 (120pontos). Sessões longas e dispositivos reais pendentes. |
| A12 — Resultado | Resultado calculado por equipa do jogador; empate explícito e devolução da entrada; prémios alinhados com arredondamento SQL. | Testes locais de estado/contabilidade, incluindo residual cêntimo. |
| A13 — Reconexão | Prazo absoluto do servidor, sincronização após eventos/rede/visibilidade e consulta periódica; rejeições libertam loading/inFlight. DELETE e snapshot P0002 identificam mesa removida, separados de acesso recusado42501. | Testes SQL da distinção e revisão de caminhos de erro. Falhas reais de transporte, Realtime e cron ainda por ensaiar no staging. |
| A14 — Acessibilidade | Cartas com nomes e controlos identificáveis, instruções de jogo e palavra-passe com rótulos acessíveis. | Revisão/inspeção local; leitores de ecrã, navegação completa por teclado e estudo com principiantes pendentes. |
| A15 — Tickets | Envio persiste pedido/mensagem, confirma apenas após sucesso e apresenta falhas. Histórico de atendimento disponível. | Testes SQL de criação, leitura e isolamento; teste utilizador→agente em duas sessões pendente. |
| A16 — Atendimento | Encaminhamento humano, atribuição e resolução/reabertura; bot identifica limitações e não promete SLA não comprovado. | Testes SQL de fila/atribuição/resolução. Equipa, escala e horário real de atendimento continuam operacionais. |
| A17 — Histórico suporte | Escrita direta bloqueada; RPCs validam autor, atribuição e estado. | Testes SQL de alteração/intrusão e acesso legado. |
| A18 — Pagamentos | Comunicação pública, carteira e apoio alinhados com beta gratuito; levantamentos indisponíveis e nenhuma integração real anunciada como ativa. | Revisão de código e páginas. Conteúdos já gravados em CMS/banners no projeto real precisam de revisão editorial. |
| A19 — Livro de teste | Modo privado beta/pausado e marcação `ledger_mode=beta`; flag não ativa dinheiro real. | Testes SQL de créditos/limites. Conversão para operação real e procedimento de reset não implementados/executados como pagamento ou eliminação de dados. |
| A20 — Comissões | Fecho transacional, comissões calculadas da receita efetiva, empate sem taxa/comissão e proteção contra repetição; residual de arredondamento conciliado. | Testes SQL de repetição/empate/conservação. Contenção multi-conexão e carga ainda pendentes. |
| A21 — Boas-vindas | Crédito após confirmação de email com registo único, sem substituir saldo existente; removida criação frágil do cliente. | Testes SQL de ativação e idempotência. Confirmação/reenvio reais do Supabase Auth pendentes. |
| A22 — Taxa | Entrada, pote, taxa de 20%, prémio e ganho líquido explicitados antes da criação/ingresso e no resultado. | Fórmulas alinhadas com SQL. Compreensão, retenção e viabilidade comercial exigem estudo com utilizadores; não foram inferidas dos testes. |
| A23 — LP | Beta gratuito, Moçambique, reset, demonstração e capacidades efetivas substituem promessas de dinheiro/licença/capacidades não demonstradas. Aviso também no registo. | Revisão e navegador local. Aprovação editorial/legal final e campanhas não realizadas. |
| A24 — Localização/métricas | Idioma e comunicação ajustados; Moçambique prioritário na lista de nacionalidades e terminologia do beta. | Parcial: pesquisa com residentes, analytics/funil, aquisição D1/D7 e validação cultural não executados. |
| A25 — Qualidade | ESLint executável, typecheck e CI; bypass TypeScript removido; testes reproduzíveis. Formulários usam useActionState com assinatura correta. | Build/typecheck/testes passam. Lint permite avisos legados de any, variáveis/imagens e dependências de hooks; não equivale a código sem dívida técnica. Sete exceções locais documentam carregadores assíncronos; não foi desativado o conjunto de regras de hooks. |
| A26 — Desempenho | Estados de recuperação, controlo de pedidos simultâneos e imagens responsivas ajustados; build otimizado verificado. | Parcial: sem benchmark de carga, RUM, LCP/INP/CLS, consumo móvel, redes moçambicanas ou garantia de escala. Consulta de fallback a cada 5 s deve ser medida sob carga. |
| A27 — PWA/documentação | README/manifest e documentação alinhados com web beta; não promete suporte offline nem PWA instalada. Variáveis e migrações documentadas. | Build local. Instalação PWA/offline não faz parte desta entrega. |
| A28 — Histórico/levantamentos | Histórico paginado de jogos/transações, tipos financeiros corretos e gestão administrativa de pedidos legados com auditoria/reembolso idempotente. Novos levantamentos bloqueados no beta. | SQL local e build. Não há gateway nem envio de dinheiro; operação real depende de projeto posterior autorizado. |
| A29 — RLS financeira | RLS/grants explícitos para livro financeiro e suporte; mutações só por caminhos autorizados. | Matriz de papéis em PostgreSQL isolado. Conferir/aplicar migrações no projeto instalado continua obrigatório. |

## Verificação reproduzível

Executar `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:db`, `npm audit --omit=dev --audit-level=moderate` e `npm run build`. O CI em `.github/workflows/quality.yml` executa estes passos.

O [build final](build-final.txt), executado após as últimas correções de interface e paisagem, usou exclusivamente `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=local-audit-placeholder` e `NEXT_TELEMETRY_DISABLED=1`; passou compilação, TypeScript e geração de 27 páginas. Os testes de regras executam 1.000 partidas simuladas e o teste de mesa verifica 40 jogadas, recuperação e conservação de pontos. O teste PostgreSQL usa PGlite local com shims de Auth/publication; não demonstra entrega de eventos Realtime nem equivalência integral ao Supabase hospedado.

A revisão independente e os números finais estão em [VERIFICACAO.md](VERIFICACAO.md). Os relatórios históricos originais mantêm os resultados observados antes das correções.

## Condições antes de ampliar o beta

1. Rever o histórico instalado, fazer backup e ensaiar 106–108 em staging antes de qualquer aplicação ao projeto publicado; seguir [Implementação beta e suporte](IMPLEMENTACAO-BETA-SUPORTE.md). Confirmar RLS, grants, storage e funções existentes que não estejam no repositório.
2. Rodar o segredo Turnstile já exposto e configurar segredos de cron/webhook, URL de origem e allowlist de Auth. Verificar que o serviço cron é realmente agendado e chega autenticado.
3. Testar quatro contas controladas: ingresso concorrente, partida completa, timeout, saída/cancelamento, empate, reconexão e histórico; testar conta banida e menor, confirmação/reenvio/recuperação e nova tentativa após CAPTCHA consumido.
4. Testar atendimento com utilizador e administrador em sessões distintas, fila, mensagens, reabertura e privacidade.
5. Medir carga isolada e experiência em dispositivos/redes de Moçambique; validar entendimento do beta e taxa com residentes adultos. Não escalar aquisição com base apenas nos testes locais.
6. Rever textos de CMS/banners existentes e documentos legais com os responsáveis. A licença permanece pendente; não houve contratação de prestador de pagamentos, ativação de dinheiro real nem reset de saldos.

Provas visuais locais: [demo móvel](demo-mobile-corrigido.png) e [resultado após reload](demo-resultado-corrigido.png).

Prova de paisagem no estado em jogo: [800×360](demo-horizontal-corrigido.png).
