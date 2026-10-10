# Administração do Sueca Bot e reset beta — 2026-10-10

## Alteração
- `/admin/robot`: 16 tópicos iniciais, criação, pesquisa, edição de rascunho, publicação, pausa e reativação.
- A próxima pergunta carrega os factos publicados diretamente do banco; falha de leitura ou base vazia interrompe a resposta. Não usa silenciosamente a base estática antiga.
- Ações autenticadas com verificação de administrador ativo, RLS, RPC com autorização própria, revisão otimista e auditoria atómica. Escrita direta de clientes proibida.
- Limites de 40 tópicos, 2000 caracteres por tópico e 24000 publicados; bloqueio de credenciais reconhecíveis. Instruções de privacidade, âmbito e beta continuam no código.
- Carteiras futuras e existentes restritas a MZN. Interface identifica saldo como créditos fictícios sem valor monetário.

## Reset autorizado
O utilizador confirmou: «Zerar saldos e apagar histórico fictício».
`supabase/maintenance/reset_beta_credits_20261010.sql` é manutenção única, separada das migrações.
Apaga movimentos, levantamentos, bónus atribuídos, comissões e receita simulada; zera carteiras e acumulados financeiros, VIP e resgates. Preserva contas, resultados de partidas, suporte, comunidade, campanhas configuradas e auditoria de segurança.
Bloqueia execução fora do beta, com tabelas de dinheiro real, partidas ativas ou recibo anterior. Transação com bloqueios e timeout; conserva marcadores de liquidação e fixa corte de bónus de boas-vindas para contas antigas.

## Validação
- `npm test`: inclui 61 verificações do robô com fornecedores simulados, além das suites existentes e 1000 simulações de Sueca.
- `npm run test:db`: 195 verificações em PostgreSQL isolado, incluindo autorizações, rascunho/publicação/pausa, conflitos, auditoria, MZN e reset/replay.
- TypeScript, ESLint dos ficheiros alterados e build de produção aprovados.
- RPC no projeto de produção: guardar, publicar, pausar e reativar aprovados dentro de transação revertida; tópico temporário não permaneceu.
- Não foi usada sessão autenticada de administrador da aplicação para testar a interface em produção.

O recibo final de produção é guardado separadamente, sem dados pessoais nem credenciais.
