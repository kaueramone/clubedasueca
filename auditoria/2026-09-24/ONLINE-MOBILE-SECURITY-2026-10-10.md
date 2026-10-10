# Teste online mobile e segurança — 10/10/2026

**Resultado:** percurso de jogo concluído com quatro contas e resultado consistente nos quatro clientes. 48 controlos aprovados e uma falha de autorização confirmada no chat. Identificada também uma falha de apresentação do temporizador. Esta execução não aprova a operação com dinheiro real.

## Ambiente e limites

Produção ApostaNaSueca (`ancpcmprrubjgxtixwje`), exclusivamente em modo beta/créditos fictícios, com autorização do proprietário. Quatro contas novas `QA-Mobile-1` a `QA-Mobile-4`, sem privilégios administrativos. Sessões isoladas nos domínios .co.mz, .pt, .com e .com.br. Entrada de 50 créditos por jogador. Nenhuma conta, carteira ou partida de terceiros foi usada nos testes adversariais.

A autenticação das contas foi preparada pela API administrativa e concluída pelo fluxo de confirmação existente; não foi um teste do formulário normal de login. Não foram enviadas mensagens de email. Os testes de UI usaram Chromium: primeiro um cliente mobile e três desktop; a meio da primeira partida, os quatro passaram para 393×740. A reabertura dos quatro clientes recuperou mãos, vez, trunfo e placar do servidor. Não houve teste num iPhone físico/Safari nem simulação de rede móvel instável.

## Partidas completas

| Mesa | Exercício | Resultado A–B | Movimentos | Cartas distintas | Liquidações |
| --- | --- | --- | --- | --- | --- |
| `a760694e-f480-46a2-84b5-1dc7b6d5e75e` | Quatro interfaces reais, dois toques, API adversarial em paralelo e watchdog ativo | 84–36 | 40 | 40 | 1 |
| `cc3a3e3a-4041-40af-8bb0-828bd9d70297` | API de quatro utilizadores: entrada duplicada, timeout prematuro, quatro timeouts simultâneos e conclusão com jogadas legais | 51–69 | 40 | 40 | 1 |

Na primeira mesa, todos os clientes apresentaram a mesma pontuação, com Nós/Eles invertidos corretamente para a equipa B, vitória/derrota coerentes e zero cartas na mão. Documento e viewport coincidiram em cada vista mobile, sem rolagem. Sem erros de consola nos quatro clientes. O registo da UI contém 36 interações de jogada; a mesa também recebeu o teste concorrente pela API e ficou sujeita ao watchdog. Não se afirma que as 40 jogadas foram todas introduzidas manualmente pela interface.

Reconstituição independente das 40 cartas da primeira partida verificou posse da carta, obrigação de seguir o naipe, sequência dos turnos, vencedor de cada vaza e pontuação final 84–36. Houve dez vazas e dez movimentos por jogador. Cada mesa registou quatro débitos de 50, dois prémios de 80 e uma taxa simulada de 40: 200 = 160 + 40. Na primeira mesa os saldos passaram de 100 para 130 nos vencedores e 50 nos perdedores.

## Controlos aprovados

- Os quatro snapshots e as leituras diretas protegidas por RLS ocultaram as mãos adversárias. Acesso anónimo ao snapshot recusado.
- Recusados: jogar fora da vez, agir em nome de outra conta, utilizador atuante nulo, carta inválida, carta que não pertence à mão e não seguir o naipe quando obrigatório.
- Pedidos concorrentes da mesma carta: um aplicado, outro recusado; a mão diminuiu apenas uma carta.
- Entrada concorrente repetida: um lugar e um débito para esse utilizador. A repetição responde com sucesso idempotente (`already_joined`), comportamento previsto pelo RPC.
- Timeout antes do prazo recusado. Depois de esperar 31 segundos reais, quatro pedidos simultâneos produziram uma jogada e deixaram 39 cartas no conjunto das mãos.
- Alterações diretas de mãos e pontuações não afetaram linhas nem o snapshot; inserção direta de movimento recusada por RLS. Rebaralhar, forjar liquidação, mudar resultado encerrado, obter novo reembolso por cancelamento/saída e jogar depois do fim foram bloqueados.
- Recusados montantes zero, negativos, NaN, infinito, acima do limite e com precisão excessiva; crédito na carteira de outra conta e levantamento no beta bloqueados.
- Papel administrativo em `user_metadata` não concedeu privilégios. Alteração do papel protegido no perfil e chamada administrativa de bónus recusadas. JWT com papel adulterado retornou HTTP 401.
- Endpoints internos de watchdog e comunidade retornaram 401 sem segredo. Conta banida com token ainda existente não conseguiu criar uma mesa.

O ficheiro JSON contém os 49 controlos (48 aprovados, um reprovado). O primeiro rascunho do executor considerava uma atualização RLS sem erro HTTP uma falha; a verificação de zero linhas alteradas e snapshot inalterado corrigiu essa interpretação. O mesmo ocorreu com a repetição idempotente de entrada, depois confirmada pelo registo de débitos e lugares. Não foram falhas exploráveis do servidor.

## F01 — Chat permite acesso anónimo e remetente inventado — P1

**Reproduzido.** Dois clientes sem sessão autenticada subscreveram `game-<ID da mesa QA>`. Um publicou `chat_message` com um campo `sender` inventado; o outro recebeu a mensagem. O envio retornou `ok`. Foi usada apenas uma mensagem inofensiva na mesa QA já concluída, sem jogadores reais.

`game-table.tsx` cria um canal público, aceita o payload de broadcast diretamente e envia o nome no próprio cliente. Quem conhecer o ID de uma mesa pode, nas condições testadas, subscrever esse canal e publicar mensagens como se fosse outra pessoa. A UI escapa texto, mas isso não autentica a identidade do remetente.

**Impacto confirmado:** quebra de autorização/confidencialidade do canal e falsificação do nome no payload. Não houve alteração de cartas, turnos, pontuação ou saldos por esse canal; o jogo usa os RPCs e snapshots autoritativos para esses dados.

**Correção necessária:** autenticar a subscrição por participação na mesa e derivar a identidade do remetente no servidor. Um canal privado por si só não torna verdadeiro um campo `sender` enviado pelo cliente. Usar mensagens validadas/persistidas pelo servidor, com limites de tamanho/frequência, e testar recusa de anónimos, não participantes e falsificação de identidade. Esta correção ainda não foi aplicada nesta execução de testes.

## F02 — Contador depende do relógio local — P2

**Reproduzido.** O relógio deste computador estava cerca de três minutos atrás do Supabase. A UI exibiu contagens próximas de 200 segundos para turnos de 30 segundos. `secondsToDeadline()` usa `Date.now()` local sem sincronização com a hora do servidor. Mudar o relógio do dispositivo pode, por isso, distorcer o contador e o momento em que esse cliente pede timeout.

Os testes demonstraram que o servidor recusou timeout prematuro e serializou os pedidos concorrentes corretamente. O relógio local não concedeu autoridade para mudar resultados. O watchdog está ativo com execução a cada minuto; a presença do job não é uma medição do seu SLA.

**Correção necessária:** incluir a hora do servidor no snapshot, calibrar o prazo no cliente e contar o tempo decorrido com relógio monotónico. Manter a validação e recuperação autoritativas no servidor. Validar relógios adiantados/atrasados e regresso do navegador do background. Ainda não corrigido nesta execução.

## Avisos de configuração revistos

O Advisor do Supabase continua a assinalar proteção contra senhas comprometidas desativada; deve ser resolvida antes de contas de apostas reais: [orientação oficial](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

Também assinala quatro funções auxiliares de cartas sem `search_path` fixo: [orientação](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable). É uma pendência de endurecimento; este teste não demonstrou exploração.

Os avisos de views definer foram inspecionados: `public_profiles` e `blog_authors` selecionam apenas id, username e avatar_url; a segunda restringe a autores de posts publicados. Não foi demonstrada exposição de email, nascimento ou carteira nessas views. [Aviso do linter](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view). As tabelas do schema privado sem políticas mantêm negação por RLS, e os avisos genéricos de RPCs SECURITY DEFINER precisam de revisão das guardas, não de revogação indiscriminada dos RPCs que a aplicação usa. A lista integral foi guardada.

## Encerramento

Quatro perfis de teste bloqueados, quatro contas Auth bloqueadas, zero sessões Auth restantes e zero mesas QA inacabadas. Guardados os registos de auditoria; não apagados utilizadores nem movimentos. Credenciais e sessões temporárias removidas do disco. Sem alterações de código, permissões, schema ou publicação nesta execução.

Evidências nesta pasta: `online-security-results-2026-10-10.json`, `online-security-advisors-2026-10-10.json`, `online-ledger-verification-2026-10-10.json`, `online-game-replay-2026-10-10.json`, `online-mobile-ui-results-2026-10-10.json` e capturas `online-mobile-*.png`.

Não coberto: carga sustentada/DoS, distribuição estatística e imprevisibilidade do baralho, conluio entre parceiros, múltiplas contas/dispositivos, fraude de pagamentos, integrações com dinheiro real, exploração exaustiva de todos os endpoints nem um pentest independente. A ausência de manipulação nos cenários executados não é uma garantia de ausência de vulnerabilidades.
