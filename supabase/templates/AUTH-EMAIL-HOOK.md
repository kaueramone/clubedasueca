# Remetente de autenticação por domínio

Endpoint: `https://clubedasueca.co.mz/api/auth/send-email` (POST assinado pelo Supabase; runtime Node.js na Vercel).

O Send Email Hook substitui todos os envios Auth do Supabase. O endpoint trata recuperação, confirmação, convite, magic link, reautenticação, alteração de email com uma ou duas confirmações e notificações de segurança. A origem de `email_data.redirect_to` determina o remetente; `www` usa o domínio raiz. Eventos sem redirect, incluindo notificações iniciadas sem contexto de navegador, usam o Site URL validado. Nunca usar o domínio do email do destinatário ou um campo editável do perfil para escolher remetente.

| Origem | From |
|---|---|
| clubedasueca.pt | Clube da Sueca <noreply@clubedasueca.pt> |
| clubedasueca.co.mz | Clube da Sueca <noreply@clubedasueca.co.mz> |
| clubedasueca.com | Clube da Sueca <noreply@clubedasueca.pt> |
| clubedasueca.com.br | Clube da Sueca <noreply@clubedasueca.pt> |

Recuperação usa `/auth/confirm?token_hash=...&type=recovery`, preservando a proteção contra scanners. Os outros links usam `/auth/v1/verify` do Supabase com callback no domínio de origem. O registo passa emailRedirectTo explicitamente. Notificações não incluem tokens de acesso. HTML escapa valores e inclui texto simples.

## Ativação

1. Verificar os dois domínios de envio .pt e .co.mz no Resend. Manter click/open tracking desativados. Por decisão do proprietário, .com e .com.br usam remetente .pt, preservando o domínio de origem nos links. Manter o domínio existente do outro projeto e o plano atual.
2. Permitir `/auth/callback` nos domínios de produção no Supabase Auth, além dos destinos de recuperação já existentes.
3. Criar duas chaves Resend apenas de envio, cada uma restrita ao respetivo domínio; guardar como `RESEND_API_KEY_PT` e `RESEND_API_KEY_MZ` sensíveis na Vercel, nunca NEXT_PUBLIC. Não guardar chaves em ficheiros ou commits.
4. Configurar HTTPS Send Email Hook no Supabase Auth para o endpoint acima, com segredo de assinatura gerado. Guardar o mesmo segredo em `SEND_EMAIL_HOOK_SECRET` sensível na Vercel; aceita `v1,whsec_...`.
5. Definir `AUTH_EMAIL_VERIFIED_DOMAINS=clubedasueca.pt,clubedasueca.co.mz` após confirmação no fornecedor e `AUTH_EMAIL_HOOK_ENABLED=true`; publicar e testar endpoint antes de ligar o hook. Sem configuração completa o endpoint responde 503 e não envia. Não ligar o hook enquanto isso.
6. Testar envio e recuperação reais de cada domínio, com destinatário de teste autorizado. Conferir From, DKIM/SPF, entrega, confirmação e nova senha. Não consumir links de clientes.

Assinaturas são verificadas pela biblioteca standardwebhooks, com tolerância de cinco minutos e limite de corpo de 64 KiB. Repetições usam a mesma Idempotency-Key no batch Resend; alteração segura de email envia ambos os emails na mesma chamada. Falhas do fornecedor devolvem erro genérico de serviço sem dados do destinatário/token. Timeout de 3,5 segundos para respeitar o limite do hook.

## Reversão

Desativar o Send Email Hook no painel Supabase primeiro, restaurando o envio padrão/SMTP configurado. Depois desativar a flag e publicar. Desativar só a flag com hook ligado interrompe os emails Auth.

## Estado em 10/10/2026

Implementação e 49 verificações locais concluídas, além das regressões existentes. Domínios .pt e .co.mz verificados no Resend; quatro registos por zona publicados na Cloudflare com TTL 300, sem proxy. Duas chaves restritas configuradas na Vercel. A ativação e a entrega real são registadas no relatório de verificação após publicação.

Fontes: https://supabase.com/docs/guides/auth/auth-hooks/send-email-hook ; https://resend.com/docs/api-reference/emails/send-batch-emails
