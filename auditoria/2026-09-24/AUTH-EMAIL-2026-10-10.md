# Verificação do envio por domínio — 10/10/2026

## Configuração publicada

- Projeto Supabase ApostaNaSueca: `ancpcmprrubjgxtixwje`.
- Código: `ac97fa71bbde0b74097bbee4c57b8a7b51427f8f`.
- Vercel produção: `dpl_8v3vhxusAPjUby9931FPozoBaix8`, READY, aliases dos quatro domínios e www.
- Send Email Hook HTTPS: `https://clubedasueca.co.mz/api/auth/send-email`, ENABLED, confirmado após recarregar o painel.
- .pt e .co.mz verificados no Resend, com tracking desligado e duas chaves apenas de envio restritas ao respetivo domínio.
- Segredos guardados como variáveis sensíveis de produção; nenhum segredo neste relatório ou no repositório.
- .com e .com.br usam remetente .pt, preservando links no domínio do pedido, conforme o âmbito reduzido pelo proprietário. Nenhuma alteração de plano ou domínio de outro projeto.
- Cinco callbacks exatos acrescentados à allowlist Supabase: .co.mz e www dos quatro domínios. Entradas anteriores e Site URL .pt preservados.

## Evidência

- Typecheck e ESLint dos ficheiros alterados passaram.
- `npm test` passou: regras com 1.000 simulações, estado de mesa, 32 verificações de banners, 36 de recuperação e 49 do envio por domínio.
- Endpoint de produção: pedido sem assinatura devolveu 401; pedido corretamente assinado com origem proibida devolveu 400, sem enviar email. Confirma assinatura e configuração sem consumir tokens de clientes.
- Dois emails de teste autorizados, enviados pelo mesmo endpoint batch Resend e pelas mesmas chaves restritas usadas pela aplicação. Ambos registados como **delivered** pelo fornecedor: um de `Clube da Sueca <noreply@clubedasueca.pt>` e outro de `Clube da Sueca <noreply@clubedasueca.co.mz>`.
- Estes testes não alteraram senhas e não continham links de recuperação. O estado delivered confirma aceitação pelo servidor destinatário, sem comprovar a pasta de entrada.
- Não foi pedido um terceiro email de recuperação nesta etapa. A validação do novo hook combina assinatura em produção, testes locais do payload/link e entrega real separada; não equivale a um novo ciclo completo de recuperação pelo email recebido.

Comprovativos: `auth-email-hook-enabled-2026-10-10.png`, `auth-email-dns-pt-2026-10-10.png`, `auth-email-dns-mz-2026-10-10.png`. Valores DNS e reversão documentados em `supabase/templates/AUTH-EMAIL-HOOK.md` e `AUTH-EMAIL-DNS-2026-10-10.md`.
