# ApostaNaSueca / Clube da Sueca

Aplicação web de Sueca online para Moçambique, em beta com créditos fictícios. Não há cobrança, pagamentos móveis nem levantamentos. Todos os saldos de teste serão repostos a zero no lançamento oficial. A licença e o prestador de pagamentos da futura operação estão pendentes.

## Desenvolvimento

Instale as dependências com `npm install`, configure as variáveis documentadas em `.env.local.example` e execute `npm run dev`. As versões efetivas de Next.js e React estão em `package.json`.

A base de dados tem migrações incrementais em `supabase/migrations`. O schema inicial isolado não representa o estado atual. Valide a sequência num projeto de teste e confirme o histórico instalado antes de atualizar uma base existente. As migrações da auditoria não foram aplicadas em produção por este trabalho.

`PLATFORM_MODE=beta` e a configuração privada da base de dados controlam a disponibilização de créditos de teste. Um modo diferente não ativa pagamentos reais. Nunca exponha a service role em variáveis `NEXT_PUBLIC_*`.

## Experiência atual

- Demonstração e treino com bots; mesas multiplayer através do navegador.
- Carteira de créditos fictícios com histórico paginado.
- Suporte com pedidos persistentes, estados, mensagens e atendimento administrativo. Sem SLA garantido no beta.
- Não existe suporte offline nem promessa de instalação PWA. Use uma ligação à internet; não são necessárias aplicações externas.

## Verificação e lançamento

Use os comandos de lint, typecheck e testes em `package.json`. A revisão em `auditoria/2026-09-24` documenta os achados e os limites dos testes. A validação do ambiente publicado, de quatro contas simultâneas e das políticas instaladas exige um ambiente de teste configurado.

Antes de qualquer operação com dinheiro real são necessários os processos de licença, prestador de pagamentos, verificação de identidade, política de privacidade final e reconciliação financeira. Este beta não os ativa.

Projeto privado.
