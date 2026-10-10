# Support Desk — estados reversíveis

O painel e o suporte do utilizador usam Em espera, Em resolução e Resolvido. Os estados antigos open e closed continuam legíveis, agrupados em Em espera e Resolvido, respetivamente, sem apagar histórico.

O administrador pode alterar o estado nos dois sentidos. O campo de resposta permanece visível em todos os estados. Responder como administrador atribui automaticamente um chamado sem responsável e coloca-o Em resolução; responder como utilizador coloca-o Em espera. Ambas as respostas limpam resolved_at. A atribuição a outro administrador continua protegida, assim como as verificações de administrador banido, propriedade do utilizador, limites de mensagens e histórico imutável.

As alterações de estado usam uma RPC autenticada com bloqueio da linha, validação de estados, search_path fixado e aviso no histórico. Pedir o mesmo estado é idempotente. A RPC antiga resolve_support_ticket permanece compatível. O chat de contactos retoma a conversa mais recente, incluindo resolvidas, em vez de abrir um chamado duplicado. O painel acompanha atualizações de estado e mensagens por Realtime, com atualização periódica de recuperação.

Validação: 138 asserções PostgreSQL local, incluindo resposta após resolução, transições reversíveis, timestamp de resolução, repetição idempotente, reabertura de chamado antigo closed sem responsável, utilizadores sem autorização e administrador banido. TypeScript passou. ESLint dos ficheiros alterados passou sem erros; os avisos restantes no chat de contactos são de tipos any preexistentes.

Migração aplicada no projeto Supabase ancpcmprrubjgxtixwje: support_reopenable_status. Permissões verificadas remotamente: anon sem EXECUTE, authenticated com EXECUTE sujeito à autorização interna. Não foram criadas mensagens ou alterados chamados reais para testar. Não havia sessão autenticada de administrador disponível no navegador; o percurso visual autenticado não foi executado nesta etapa.
