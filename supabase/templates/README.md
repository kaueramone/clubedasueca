# Recuperação de senha

O modelo `recovery.html` corresponde ao email **Authentication → Emails → Reset password** do projeto ApostaNaSueca (`ancpcmprrubjgxtixwje`). Preserva o conteúdo visual existente e altera o botão para:

```html
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery
```

A aplicação passa `https://<domínio atual>/auth/confirm` em `resetPasswordForEmail`. Abrir ou pré-visualizar o link apenas apresenta a confirmação. O botão **Continuar para nova senha** submete uma Server Action que verifica o token, grava a sessão e encaminha para `/update-password`. Scanners de email não consomem o token com GET/HEAD; a confirmação também não depende do cookie PKCE de outro navegador.

Assunto configurado: **Clube da Sueca — Recuperação de senha**. O [Send Email Hook](AUTH-EMAIL-HOOK.md) substitui o envio padrão por remetentes verificados .pt e .co.mz. Este modelo do painel permanece como alternativa quando o hook está desligado; o assunto isolado não altera o remetente padrão.

O painel Supabase deve permitir os destinos `/auth/confirm` dos domínios de produção. Em 10/10/2026 foram acrescentados os destinos exatos de `.co.mz`, dos quatro domínios `www` e de `clubedasueca.vercel.app`, preservando as entradas existentes `.pt/**`, `.com/**` e `.com.br/**`. Foi também permitido o callback legado `.co.mz/auth/callback?next=/update-password`.

A configuração de Auth é externa às migrações SQL. Publicar a rota antes de guardar o modelo no Supabase. O Site URL existente `.pt` foi preservado; o email de recuperação utiliza o RedirectTo autorizado.

A entrega real do novo hook é documentada separadamente do teste do fluxo de recuperação. Os testes locais não enviam emails nem alteram senhas de clientes.
