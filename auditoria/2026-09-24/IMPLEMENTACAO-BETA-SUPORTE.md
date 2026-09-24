# Implementação: beta, suporte e comunicação

Alterações locais em 24/09/2026. Não houve publicação nem acesso/mutação de produção.

## Entregue

- A15–A17: pedido e primeira mensagem criados numa transação SQL, identificador visível, acompanhamento de estado/responsável/mensagens pelo jogador e fila administrativa real. FAQ aguardada; falha da FAQ não transforma um pedido guardado em erro de envio. Toda mensagem de utilizador volta à fila humana. Admin só responde após atribuição. Interface não apresenta mensagens temporárias como entregues.
- 107: RLS e privilégios de suporte limitam leitura ao titular/admin; históricos atuais e antigos não aceitam INSERT/UPDATE/DELETE direto de utilizadores. Funções validam autenticação, bloqueio, autoria, limites, atribuição e transições. Tickets têm limite de dez/hora e mensagens de trinta/minuto, com bloqueio por utilizador.
- A18/A23/A24: LP, páginas públicas, FAQ e bot comunitário descrevem Moçambique e beta gratuito; sem promessa de pagamentos, certificação, torneios ou deteção de conluio inexistentes. Aviso de créditos fictícios/reset na LP, painel e documentos. Depósito pede apenas quantidade de teste, com validação servidor e limite; retirada bloqueada no servidor e interface. Sem telefone/PIN financeiro. Taxa de 20% e exemplo de distribuição divulgados antes de criar/entrar em mesa, incluindo empate sem taxa.
- A05: presença sem email/logs; diretório e mensagens usam public_profiles, sem pesquisar email/nome privado. Service role no admin só após autorização. SessionGuard termina apenas a sessão local.
- A27/A28: histórico paginado de movimentos e partidas; admin transações paginadas, classificação withdrawal correta e sem alegar pagamento. README e manifesto passam a descrever aplicação web dependente de internet, sem ícones inexistentes nem promessa PWA.

## Verificação local

- `npx tsc --noEmit --pretty false`: passou após as alterações deste escopo.
- `node tests/database-security.cjs`: 124 asserções passaram com migrações 106, 107 e 108 em PostgreSQL local PGlite. Inclui ticket atómico, impersonação de bot recusada, alteração/apagamento recusados, privacidade entre contas, fila após follow-up, atribuição e resolução administrativa, proteção dos registos legados.
- Estes testes usam roles/auth simulados; não comprovam a configuração Supabase publicada, publicação Realtime, navegador autenticado ou atendimento humano disponível.

## Instalação e validação pendente

1. Inventariar migrações realmente instaladas e guardar cópia de segurança. `104_fix_rls_recursion.sql` já existia localmente fora do controlo de versão antes deste trabalho: rever e confirmar esse pré-requisito antes de 105/106. Não aplicar o schema inicial sobre base existente.
2. Aplicar 106, 107 e 108, por esta ordem, primeiro em Supabase de teste. Publicar o código compatível em conjunto. A falha na ausência destas migrações é intencional (não reativar writes inseguros para contornar erros).
3. Configurar os exemplos sem segredos reais de `.env.local.example`: `PLATFORM_MODE=beta`, Turnstile, cron e webhook. O modo da base privada também deve permanecer beta. Um sinalizador não ativa operação financeira real.
4. Confirmar com duas contas e um administrador: criar ticket, responder, resolver, reabrir, recarregar, simular falta de rede; validar mensagens no histórico e ausência de acesso cruzado. Confirmar Realtime/publicação; a página de suporte também consulta periodicamente o histórico.
5. Testar navegação com leitor de ecrã e telemóvel, histórico com mais de vinte registos, limites de créditos e chamadas diretas negadas. Validar a experiência de quatro contas com a equipa de jogo.

## Pontos que dependem do operador

A aprovação da licença, prestador de pagamentos, dados formais do responsável, prazos de conservação e políticas finais não podem ser inventados no código. As páginas identificam a fase atual e os dados ainda por publicar. O reset de saldos é comunicado, mas não foi executado nem agendado. Conteúdo CMS/banners já gravado na base precisa de revisão editorial separada; alterar o código não reescreve esse conteúdo.

O contador público de partidas nos balões do chat foi retirado (a antiga consulta usava service role e era inconsistente); os nomes e avatares continuam disponíveis pelo diretório público. Registos legados de suporte são preservados e protegidos; não se apresentam como novos tickets do live chat.

## Correções da revisão independente

A migração 108 fecha o bypass de administradores banidos nas políticas legadas, preservando condições de linhas e buckets; arredonda cada prémio antes de atribuir à casa o residual exato do pote; e cria uma RPC autenticada/transacional para contabilizar cliques de banners. O antigo incremento não existia no repositório e a ação anunciava sucesso sem verificar erros. A nova ação só confirma após persistência.

A assinatura de admin_apply_bonus usa dois argumentos, conforme a função SQL. A interface de prémios usa cálculo em cêntimos consistente com a liquidação. get_table_state distingue mesa eliminada (P0002) de acesso recusado (42501), permitindo recuperação após desconexão.

Os testes locais agora incluem conservação do pote com entrada de 50,01 a 50,05 créditos; administrador banido em afiliados, bónus, CMS, banners e storage; restrição ao bucket mantida; aplicação administrativa de bónus com dois argumentos; e códigos de erro de mesa eliminada/inacessível.
