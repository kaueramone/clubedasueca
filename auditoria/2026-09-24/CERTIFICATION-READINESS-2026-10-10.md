# Preparação técnica para certificação — Clube da Sueca

Consulta em 10/10/2026. Projeto Supabase: ancpcmprrubjgxtixwje. A plataforma continua em beta, com créditos fictícios. Este documento é um diagnóstico de preparação, não um certificado, parecer jurídico ou aprovação para apostas reais.

## O que foi encontrado nas fontes oficiais

A [IGJ — Como obter uma licença (jogos sociais)](https://igj.co.mz/?page_id=1031) identifica a Lei 9/2012 e o Decreto 33/2018. Para operadores online, publica exigências de domínio MZ, restrição de menores, jogo responsável, privacidade, termos, identificação empresarial/licença, HTTPS e certificado da plataforma traduzido para português. Também exige backups em território nacional, acesso da fiscalização e aprovação dos sistemas com integridade/confidencialidade. A aplicação desse regime à Sueca com apostas precisa de confirmação expressa.

Há um sinal de alteração normativa: [notícia da IGJ de setembro de 2026](https://igj.co.mz/?cat=1). O [sumário da Imprensa Nacional](https://inm.gov.mz/pt-br/content/sum%C3%A1rio-br-n%C2%BA-180-de-150916-boletim-da-rep%C3%BAblica-i-serie-p%C3%A1g-1813) menciona Decreto 61/2026 sobre jogos online, mas o título/URL trazem data de 2016. Não foi obtido o texto integral autenticado para resolver a inconsistência. Não se assume vigência, enquadramento ou artigos com base nessa página.

Não foi localizada, nas fontes consultadas, uma lista pública inequívoca de laboratórios aceites ou uma bateria técnica obrigatória específica para Sueca. Confirmar esses pontos e o diploma aplicável diretamente no processo de licenciamento. As páginas de jogo responsável da IGJ incluem referências portuguesas; isso não torna a legislação portuguesa automaticamente aplicável a Moçambique.

## Referência técnica complementar

A [GLI publica GLI-19 v3.0 e documentos de segurança](https://gaminglabs.com/gli-standards/), incluindo [tradução portuguesa](https://gaminglabs.com/wp-content/uploads/2022/01/GLI-19-Interactive-Gaming-Systems-v3.0-Language-Verification-Portuguese.pdf). É uma referência de preparação; não foi confirmada como norma mandatória moçambicana nem a aceitação desse laboratório para este processo.

Os temas úteis são relógio (2.2), contas (2.5), informação/relatórios (2.8–2.9), RNG (capítulo 3), regras e resultados (capítulo 4), P2P (4.11), recuperação (4.14–4.16), conluio/fraude (A.7–A.8), segurança e mudanças (anexo B). A avaliação exige versão identificada, ambiente representativo e evidências operacionais; testes próprios não substituem ensaios independentes.

## Correções desta entrega

- Chat: mensagens persistidas em `game_messages`; autor, nome e hora definidos no banco. Apenas participantes elegíveis enviam; participantes ativos leem via RLS. Sem escrita direta, edição ou eliminação por clientes. Texto até 500 caracteres; intervalo de dois segundos e máximo de 20 mensagens/minuto por conta, serializados para impedir corrida entre mesas. UUID de pedido evita duplicar mensagens ao repetir um envio. Os broadcasts antigos não são aceites pela interface.
- Contador: `get_table_state` inclui `server_now`. O cliente calcula o prazo a partir desse instante e mede o tempo decorrido com `performance.now()`. A latência descontada é conservadora. Recuperação de ligação/visibilidade recalibra o relógio; o servidor continua a decidir quando pode jogar por timeout.
- Distribuição online: Fisher–Yates com bytes de `extensions.gen_random_bytes`, rejeitando valores que causariam viés modular. Sem seed fornecida pelo cliente ou pelo relógio, sem fallback para `random()`. Falhas do gerador abortam a transação. A distribuição continua interna, atómica e protegida contra redistribuição.
- Funções puras de cartas passaram a ter `search_path` fixo.

A documentação do [PostgreSQL sobre pgcrypto](https://www.postgresql.org/docs/current/pgcrypto.html) descreve a origem criptográfica dos bytes. Isso não certifica esta implementação nem a infraestrutura do fornecedor.

## Matriz de preparação e critérios de aceitação

| Área | Evidência atual | Trabalho necessário antes de dinheiro real |
| --- | --- | --- |
| Integridade da partida | Regras no servidor, mãos privadas, rejeição de jogadas ilegais e conservação de 40 cartas/120 pontos | Laboratório validar variante exata da Sueca, desempate, trunfo, timeout e regras publicadas |
| RNG | Embaralhamento criptográfico e teste de rejeição sem viés | Ensaio estatístico independente, avaliação da entropia/infraestrutura, revisão do algoritmo e versão certificada |
| Chat / conluio | Identidade autenticada, histórico persistido e limites de envio | Política de retenção, denúncia, revisão de incidentes e deteção de conluio/multicontas/bots. Autorização do chat não impede parceiros de partilhar cartas por outros meios |
| Créditos / contabilidade | Liquidação atómica/idempotente e créditos de teste | Integração de pagamento aprovada, reconciliação, estornos, custódia/segregação e regras fiscais confirmadas |
| Identidade / proteção | Idade declarada validada no servidor e bloqueio de contas | KYC documental, identidade única, autoexclusão, limites, prevenção de branqueamento e respetivos ensaios; data de nascimento declarada não equivale a KYC |
| Domínio / comunicação | Domínio .co.mz, HTTPS e aviso de beta | Informação societária/licença efetiva, regulamentos aprovados e revisão comercial após concessão |
| Backups / fiscalização | Nenhuma evidência de cópia restaurável em Moçambique nesta entrega | Contratar armazenamento no país, criptografar, restringir acesso, definir retenção e demonstrar restauro; estabelecer acesso da IGJ conforme especificação aprovada |
| Continuidade | Snapshot e recuperação de ligação; watchdog existente | Ensaios de interrupção de fornecedor, carga, recuperação, RPO/RTO e evidência de restauração |
| Segurança operacional | Testes de autorização e auditoria de banco | Pentest independente, MFA administrativo, gestão de chaves, revisão de acessos e incidentes. Proteção Auth contra senhas vazadas continua pendente |
| Gestão de versão | Migrações, commit e resultados de testes | Inventário/diagrama, dependências, hashes de componentes críticos, aprovação de mudanças e procedimento de recertificação |

Nenhuma linha pendente é apresentada como cumprida. Não foi alterado o modo beta nem ativado dinheiro real.

## Ensaios reproduzíveis desta entrega

- `npm test`: regras (mil simulações), recuperação de estado, relógio, banners e fluxos Auth/email. O relógio testa atraso/avanço de um dia, mudança durante a vez, latência, pausa, reconexão e valores inválidos.
- `npm run test:db`: 170 verificações no PostgreSQL isolado, incluindo partida completa e chat (participante, externo, anónimo, bloqueado, falsificação direta, edição/eliminação, repetição idempotente, tamanho e limites de envio). PGlite usa um shim de bytes para exercitar o algoritmo; não testa a força de pgcrypto.
- Supabase real: mil baralhos, mil permutações distintas, 40 cartas únicas em todos; verificação estrutural, não prova estatística de certificação.
- `tests/live-table-security.sql`: quatro contas QA existentes, funções e papéis reais do PostgreSQL. Valida chat, relógio e partida completa com 40 jogadas/cartas distintas e 120 pontos. Todos os movimentos, créditos e alterações de bloqueio são revertidos por `ROLLBACK`. Este ensaio não simula quatro navegadores nem concorrência de rede.
- `npm run typecheck`, lint dos ficheiros alterados e build de produção. Lint sem erros; avisos preexistentes permanecem. Build local exige as duas variáveis públicas do Supabase; o primeiro ensaio sem elas falhou e o ensaio configurado passou.

A partida em quatro navegadores e os testes concorrentes anteriores estão documentados em [ONLINE-MOBILE-SECURITY-2026-10-10.md](./ONLINE-MOBILE-SECURITY-2026-10-10.md). São evidências anteriores às correções desta entrega.

## Dossier a levar à IGJ e ao laboratório

1. Confirmar classificação da Sueca entre pares/equipas com apostas, diploma vigente, modalidades permitidas e condições da concessão.
2. Obter por escrito lista de laboratórios aceites, norma/versão, escopo (plataforma, jogo, RNG, infraestrutura, operação) e idioma/formato do certificado.
3. Confirmar localização/retensão de dados, cópias em Moçambique, acesso fiscalizador, relatórios e exportações obrigatórias.
4. Congelar versão candidata e entregar regulamento da Sueca, desenho da arquitetura, inventário de fornecedores, modelo de ameaças, procedimentos internos e evidências de teste/restauro.
5. Ensaiar depósito e levantamento somente após enquadramento, fornecedor e ambiente homologável disponíveis; conciliar centavos, taxas, duplicados, falhas de rede e eventos repetidos.
6. Testar ataques simultâneos, replay, API direta, escalada de privilégios, perda de ligação em cada fase e conluio intencional entre contas QA. Registar resultado, causa e correção por versão.
7. Obter certificado externo e aprovação/homologação aplicável. Só então preparar a ativação financeira conforme o processo de licenciamento.

Nenhum contacto foi enviado à IGJ, nenhum laboratório foi contratado e nenhuma cobrança foi autorizada nesta tarefa.

## Security Advisor após as migrações

A nova tabela tem RLS e política de leitura; as quatro funções de cartas deixaram de ter `search_path` mutável. O Advisor continua a assinalar as duas projeções públicas deliberadas (`public_profiles` e `blog_authors`) como [views SECURITY DEFINER](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), funções privilegiadas expostas com guardas de autorização e [proteção contra senhas vazadas desativada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Os controlos privados sem política usam negação por defeito. Os avisos não foram ocultados nem o projeto declarado livre de vulnerabilidades.
