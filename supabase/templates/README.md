# Recuperação de senha

O modelo `recovery.html` corresponde ao email **Authentication → Emails → Reset password** do projeto ApostaNaSueca (`ancpcmprrubjgxtixwje`). Preserva o conteúdo visual existente e altera o botão para:

```html
{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery
```

A aplicação passa `https://<domínio atual>/auth/confirm` em `resetPasswordForEmail`. A rota verifica o token no servidor, grava os cookies da sessão e encaminha para `/update-password`. Assim, abrir o email noutro navegador não depende do cookie PKCE de quem pediu o email.

O painel Supabase deve permitir os destinos `/auth/confirm` dos domínios de produção. Em 10/10/2026 foram acrescentados os destinos exatos de `.co.mz`, dos quatro domínios `www` e de `clubedasueca.vercel.app`, preservando as entradas existentes `.pt/**`, `.com/**` e `.com.br/**`. Foi também permitido o callback legado `.co.mz/auth/callback?next=/update-password`.

A configuração de Auth é externa às migrações SQL. Publicar a rota antes de guardar o modelo no Supabase. O Site URL existente `.pt` foi preservado; o email de recuperação utiliza o RedirectTo autorizado.

Os testes não verificam a entrega numa caixa de email. O serviço de email do projeto continua a ser o serviço padrão do Supabase; SMTP personalizado e respetivos limites devem ser configurados para o envio geral da plataforma.
