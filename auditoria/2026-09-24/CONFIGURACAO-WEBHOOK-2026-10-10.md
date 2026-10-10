# Configuração de produção — 10/10/2026

Projeto Supabase: ApostaNaSueca (`ancpcmprrubjgxtixwje`). Projeto Vercel: `clubedasueca-rflf`, time `kaueramones-projects`.

## Aplicado

- Criado um token aleatório de 32 bytes no Vault, com o nome `app_community_webhook_secret`.
- Substituída a variável sensível `COMMUNITY_WEBHOOK_SECRET` da Vercel, exclusivamente em produção, pelo mesmo token. A API confirmou a atualização. Nenhum valor foi impresso ou gravado no repositório.
- Aplicada remotamente a migração `community_webhook_vault_auth`; a cópia local está em `supabase/migrations/20261010110030_community_webhook_vault_auth.sql`.
- O trigger `global_chat_bot` continua a disparar após INSERT de cada linha em `public.global_messages`. Agora usa `private.send_community_webhook()`, que lê o Vault e envia `Authorization: Bearer ...` para o endereço existente. O segredo não fica nos argumentos públicos do trigger.
- A função tem `search_path` vazio, referências qualificadas e execução revogada para PUBLIC, anon e authenticated. Não foram alterados saldos, utilizadores ou o modo beta.
- `CRON_SECRET`, o segredo `app_cron_secret` e o cron existente foram preservados. O teste HTTP anterior do watchdog devolveu 200, `success: true`, zero jogos processados.

## Verificação

Foi criada uma tabela temporária com a estrutura de global_messages e um trigger com a mesma função. Um INSERT sintético enfileirou a chamada pg_net; uma asserção SQL confirmou endereço, tipo INSERT, ID do registo e igualdade do cabeçalho com o segredo do Vault. A transação terminou com ROLLBACK, removendo a tabela, a linha e o pedido enfileirado antes de qualquer envio HTTP. Nenhuma mensagem foi publicada no chat.

Consulta posterior confirmou trigger AFTER INSERT ativo, função no esquema private, sem argumentos contendo segredos, search_path fixado e ausência de EXECUTE para anon/authenticated.

O advisor de segurança não identificou a nova função. Ainda lista outros objetos que exigem avaliação separada: duas views SECURITY DEFINER, quatro funções card_* sem search_path fixado, RPCs públicas/privilegiadas e proteção de palavras-passe comprometidas desativada. Os avisos de RLS sem políticas são relativos a tabelas privadas sem USAGE para anon/authenticated; não foram abertas políticas para silenciar esses avisos. Referências: [views](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable), [RPCs anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [RPCs autenticadas](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [palavras-passe](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Publicação e teste da API — concluídos em 10/10/2026

Com autorização expressa do utilizador para publicar, foi criado um deployment de produção a partir do commit auditado `26478622e70aafbb6e1882728ef542edfbdb7604`, no ramo `codex/audit-beta-hardening`, usando a conexão Git da Vercel. Os testes locais passaram novamente: 1.000 partidas e 124 asserções SQL. Não foram enviados os documentos pessoais ou outros ficheiros locais não versionados.

A primeira publicação (`dpl_DWMVNCUyhxW2udEFYkH6bFKh71f5`) revelou uma diferença entre o CRON_SECRET sensível cadastrado na Vercel e o segredo do Vault usado pelo watchdog. O teste no deployment antigo havia passado, mas aquele deployment ainda usava o seu próprio valor de ambiente. Foi atualizado exclusivamente o CRON_SECRET de produção na Vercel para coincidir com o app_cron_secret existente no Vault, sem alterar este último ou o cron. Nenhum valor foi impresso ou guardado em ficheiros.

Foi então criado um novo deployment com as variáveis atuais e o mesmo commit:

- Deployment final: `dpl_DHjJY1QAcNqX3ZQxA87wbWvCQusb`, estado READY, ambiente production, Next.js 16.3.6.
- URL: https://clubedasueca-rflf-7wq0s85cw-kaueramones-projects.vercel.app
- Construção e disponibilização: cerca de 67 segundos, segundo buildingAt/ready da Vercel.
- O domínio clubedasueca.vercel.app foi consultado e confirmou o ID e commit finais. Os domínios personalizados foram atribuídos sem aliasError.
- clubedasueca.co.mz, www.clubedasueca.co.mz, clubedasueca.pt, clubedasueca.com e clubedasueca.com.br responderam 200 com indicação de beta/créditos fictícios após a primeira publicação. Na versão final, LP, login e registo no domínio moçambicano responderam novamente 200 com os avisos.
- PLATFORM_MODE em produção continua beta.
- As duas rotas POST /api/community/respond e /api/games/tick devolveram 401 sem autorização na versão final.
- Teste pg_net 44835, com segredo do Vault e payload vazio: community respondeu 400 Invalid webhook. Confirma autenticação aceite e validação do evento, sem chamar a IA ou criar mensagem.
- Teste pg_net 44836, com segredo do Vault e sem jogos ativos: watchdog respondeu 200, success=true, processed=0. Sem timeout ou erro de transporte em ambos os pedidos.
- Consulta de logs de runtime error/fatal, filtrada para o deployment final e janela de dez minutos: nenhum registo encontrado. A ingestão de logs pode ter atraso; não equivale a monitorização prolongada.
- Drains configurados: zero. O watchdog agendado existente permanece ativo; não foi criada monitorização externa nesta publicação.

Não foram efetuados reset de saldos, ativação de dinheiro real ou testes multiplayer com quatro contas reais. O teste do webhook valida a autenticação e a rejeição de payload inválido; não valida a geração de uma resposta real do bot.
