# Verificação independente das correções

Data: 24/09/2026. Escopo: código local e migrações preparadas nesta tarefa. A revisão foi feita por agente diferente dos autores das alterações, com execução independente dos comandos abaixo. Não houve alteração ou exploração da base de produção.

## Verificações executadas

| Comando | Resultado observado |
| --- | --- |
| `npm run lint` | Exit 0; 0 erros, 199 avisos. Os avisos continuam visíveis: principalmente tipos `any`, variáveis não utilizadas, dependências de hooks e imagens. Não significa ausência de dívida técnica. |
| `npm run typecheck` | Exit 0; geração dos tipos de rotas e TypeScript concluídos. |
| `npm test` | Exit 0; 1.000 partidas simuladas, 40 cartas e 120 pontos por partida, 40 recursos gráficos presentes. Testes do estado verificam 40 jogadas, restauro após cada jogada, turno/posse, liquidação duplicada, projeção do snapshot e prazo absoluto. Inclui apresentação dos valores com centavos. |
| `npm run test:db` | Exit 0; migrações 106/107/108 aplicadas em PostgreSQL local PGlite e 124 asserções aprovadas. |
| `npm audit --omit=dev --json` | Exit 0; zero vulnerabilidades reportadas nas dependências de produção naquele momento. |

A compilação final `npm run build` foi executada pelo agente responsável pela ferramenta de qualidade, após as últimas alterações, com exit 0. O revisor leu a evidência em `build-final.txt`: Next.js 16.3.6 compilou, verificou TypeScript e gerou 27 páginas. Ambiente usado: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co`, `NEXT_PUBLIC_SUPABASE_ANON_KEY=local-audit-placeholder` e `NEXT_TELEMETRY_DISABLED=1`. Estes valores permitem compilar; não validam integração com o backend real.

## Revisão de segurança e integração

Foram inspecionadas as fronteiras de RPC, funções privilegiadas, políticas RLS, perfil público, autorização das ações administrativas, elegibilidade, isolamento de créditos fictícios, liquidação, suporte e autenticação do webhook do bot. Os testes locais usam identidades sintéticas; não usam contas ou dados reais.

A revisão encontrou e os autores corrigiram estes casos adicionais:

- **Administrador banido ainda escrevia por REST:** reproduzido em PGlite com `is_admin() = false` e alteração de `affiliates.total_earned` bem-sucedida. A migração 108 acrescenta `public.is_admin()` às políticas administrativas existentes, preservando as condições originais de linha e bucket. Os testes posteriores negam alterações de administrador banido em afiliados, bónus, banners, CMS e armazenamento, e preservam a restrição do bucket.
- **Arredondamento aumentava o pote distribuído:** entrada 50,01 gerava pote 200,04 e distribuição total 200,05. A liquidação agora arredonda os pagamentos iguais e atribui à casa o restante exato. Foram testadas entradas de 50,01 a 50,05; o contrato visual usa a mesma regra.
- **Bónus administrativo com argumento RPC excedente:** removido `p_deposit_amount` da chamada à nova função de dois argumentos; execução SQL da assinatura final aprovada.
- **Falha de rede podia bloquear jogadas:** revisto o uso de `finally` para libertar `loading` e `inFlight`, com recuperação de snapshot e apresentação do erro.
- **Mesa apagada confundida com ligação interrompida:** tratamento de DELETE confere o ID; snapshot inexistente devolve `P0002`, tratado como encerramento, inclusive após evento perdido. Falta de autorização usa `42501`, sem simular cancelamento.
- **Registo e tentativas de autenticação:** aviso de maioridade, créditos fictícios e reposição de saldos acrescentado; hook Turnstile remove o widget e os temporizadores ao desmontar e renova o desafio após tentativa. Assinaturas de `useActionState` revistas.

Não foi identificado outro P0/P1 nas fronteiras revistas após estas correções. Esta conclusão é limitada ao código e aos cenários efetivamente verificados.

## Evidência de navegador comunicada pelo coordenador

O coordenador verificou a demonstração local até terminar dez vazas, com resultado 84–36 e restauro após recarregar. Também verificou a mão a 360 px, acesso à última carta, LP com mensagem de beta e aviso no registo. Estes resultados foram comunicados ao revisor; não são sessões de navegador executadas por este agente de verificação.

Após corrigir a sobreposição em ecrã baixo, o coordenador voltou a verificar uma partida a 800 × 360 px: cartas de 44 × 62 px, centro desimpedido e sem transbordo horizontal. Nem todos os estados da recapitulação foram observados nesse tamanho. Evidência visual local: `demo-mobile-corrigido.png`, `demo-resultado-corrigido.png` e `demo-horizontal-corrigido.png`.

## Limites e passos externos necessários

- PGlite executa PostgreSQL com adaptações locais de Auth, papéis, publicação e armazenamento. Não equivale a instalar a sequência integral num projeto Supabase real nem a testar PostgREST, Realtime, Vault, cron ou concorrência de vários processos.
- Não foram executados multiplayer com quatro contas reais, cortes de rede de quatro clientes, teste de carga, Core Web Vitals, redes/dispositivos moçambicanos ou atendimento humano operacional.
- Os ramos de recuperação da interface e renovação de Turnstile foram revistos em código; não houve autenticação real nem teste integrado do desafio Cloudflare.
- Aplicar as migrações numa base de homologação compatível, verificar permissões efetivas e realizar os percursos autenticados antes de publicar. Confirmar os segredos de ambiente, substituir o segredo Turnstile anteriormente exposto e validar watchdog/webhook no ambiente de destino.
- Nenhum reset de saldos, deploy ou ativação de dinheiro real foi realizado. Licenciamento, contratação do pagamento e plano de transição do livro de teste continuam atividades externas separadas.
