# Mesa responsiva — 10/10/2026

O print do iPhone revelou cartas dentro de retângulos brancos, mão cortada lateralmente, colunas de cartas dos adversários demasiado grandes e pouco espaço útil para a jogada.

## Alterações

- Recorte CSS da área transparente dos sprites originais (64×64; desenho em x=11..53, y=2..62). As cartas usam proporção 7:10, sem o fundo branco do botão. Aplicado à mão, vaza, versos e trunfo.
- Mão mobile em duas filas de cinco, com cartas restantes centradas. Desktop mantém uma fila; horizontal curto coloca a mão à direita da mesa.
- Adversários com pilha compacta e contador, identificação da vez por texto e destaque; placar compacto no topo, vaza central e instruções junto à mão.
- Altura dinâmica da janela e áreas seguras. Mesa online ocupa a janela, sem o cabeçalho e a navegação do dashboard reduzirem a área de jogo.
- Mantidos os dois toques para jogar e a restrição de seguir o naipe. Trunfo acessível por botão; chat fechado deixa de expor campos ao teclado. Campo mobile de chat com fonte de 16px, controlos principais de pelo menos 44px.
- Preservados os fundos e a identidade visual, aviso de teste e funcionamento das partidas. Sem alterações à base de dados.

## Verificação

- Typecheck e ESLint dos ficheiros alterados: sem erros. Permanecem avisos de tipagem/hooks preexistentes no componente da mesa.
- Suite `npm test`: passou (1000 simulações de regras, estado da mesa/recarga/turnos/liquidação, banners, recuperação de senha e emails).
- Navegador: 320×568, 393×740, 844×390 e 1366×768. Sem rolagem da página; dez cartas visíveis no ecrã pequeno. Cartas de aproximadamente 55×79px em 320×568 e 64×91px em 393×740.
- Primeiro toque seleciona sem retirar carta; segundo joga e avança a vez. Verificados naipe obrigatório, fim de partida, nova partida, abertura/fecho do trunfo e chat. Chat mobile: fonte computada 16px, altura do campo ~50px. Sem erros de consola no teste local.
- Evidências PNG nesta pasta: mobile, small, landscape e desktop, com data 2026-10-10.

Os testes visuais usam Chromium com dimensões de telemóvel; não representam teste num iPhone físico/Safari. O fluxo multiplayer autenticado e a sala de espera não foram exercitados com quatro contas nesta alteração.

## Referências

- [Apple: Buttons](https://developer.apple.com/design/human-interface-guidelines/buttons) — dimensão dos alvos de toque.
- [WebKit: Safari 15.4](https://webkit.org/blog/12445/new-webkit-features-in-safari-15-4/) — unidades dinâmicas de viewport.

## Publicação

Código `a01ba75e1fa16abb9fca6818f8d6d19a56336d71`, deployment `dpl_FsNBCg5jFpGJXdrHw6gHJVTPh4dG`: READY, produção, com os domínios .pt/.co.mz/.com/.com.br atribuídos e sem erro de alias. Build de produção concluído.

Conferido `https://clubedasueca.co.mz/demo` em 393×740: dez cartas de ~64×91px totalmente visíveis, documento sem excesso de largura/altura e sem erros de consola. Evidência: `game-layout-mobile-published-2026-10-10.png`.
