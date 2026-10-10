# DNS de envio — Clube da Sueca

Registos emitidos pelo Resend em 10/10/2026 e publicados com TTL 300; CNAME apenas DNS (sem proxy). Ambos os domínios foram verificados. Os blocos abaixo preservam os valores e o estado original emitidos pelo fornecedor. Registos de envio no subdomínio send não alteram os MX da raiz.

## clubedasueca.pt

```text
DNS Records to configure:

DKIM (TXT):
  Name: resend._domainkey
  Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDHmFe7scYG4P03ppVrh8NTDy/MrKusU2wDlbI6CEiUsX9lPrhiPPg3U4EEAs++PoKkM8SQL+d5Te+L+2kmQpxgU421x5wGP0dgKajiTa6Rg1JqNzf8GiQMc7v2a8Nm4UgvTxXLR8cx/IckH/Y6ffGyzPCnM7LAl48Hh2RAkIf/iQIDAQAB
  TTL: Auto
  Status: not_started

SPF (MX):
  Name: send
  Value: feedback-smtp.eu-west-1.amazonses.com
  TTL: Auto
  Status: not_started
  Priority: 10

SPF (TXT):
  Name: send
  Value: v=spf1 include:amazonses.com ~all
  TTL: Auto
  Status: not_started

SPF (CNAME):
  Name: rsend
  Value: send.forge.rmta.net
  TTL: Auto
  Status: not_started
```

## clubedasueca.co.mz

```text
DNS Records to configure:

DKIM (TXT):
  Name: resend._domainkey
  Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQCjEpUPlc7t/g7bzo+IHqYl5H02Bo9Kbv3UuAA0b9kbqykBiM+WONkpwLo0JyarAU7hW/zorjgcz4frduDEjskVTLYaLeAJB1wZaZ9PTpjvoFzcpW6uu2NDYFYBf6NS5q/dsyAmnGuMhvVsIrA46WRKf1qd0o1hkYkOEsplrJsqhQIDAQAB
  TTL: Auto
  Status: not_started

SPF (MX):
  Name: send
  Value: feedback-smtp.eu-west-1.amazonses.com
  TTL: Auto
  Status: not_started
  Priority: 10

SPF (TXT):
  Name: send
  Value: v=spf1 include:amazonses.com ~all
  TTL: Auto
  Status: not_started

SPF (CNAME):
  Name: rsend
  Value: send.forge.rmta.net
  TTL: Auto
  Status: not_started
```

Por decisão do proprietário, .com e .com.br não serão adicionados: usarão o remetente .pt, mantendo os links no domínio de origem. O plano e o domínio de outro projeto foram preservados.
