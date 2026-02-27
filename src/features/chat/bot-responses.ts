export const botFaqResponses = [
    {
        keywords: ['deposito', 'depositar', 'pix', 'pagamento', 'saldo', 'carteira', 'dinheiro'],
        response: 'Para fazer um depósito, vá à página "Carteira" no seu Dashboard. Pode escolher MBWay, Referência Multibanco ou Cartão. Os depósitos normais são processados instantaneamente.'
    },
    {
        keywords: ['levantamento', 'levantar', 'saque', 'sacar', 'receber'],
        response: 'Para levantar os seus ganhos, vá à página "Carteira", clique no separador "Levantar" e siga as instruções. O valor mínimo é de 20€ e demora entre 1 a 3 dias úteis.'
    },
    {
        keywords: ['bonus', 'bónus', 'promo', 'promocao', 'codigo', 'rollover'],
        response: 'Todos os nossos bónus têm requisitos de aposta (rollover). Pode verificar o estado atual do seu bónus na secção "Bónus" do Dashboard. Apenas completando o rollover o saldo de bónus passará a saldo real.'
    },
    {
        keywords: ['afiliado', 'referenciais', 'amigo', 'convidar', 'comissao', 'cpa', 'revshare'],
        response: 'Temos um sistema de afiliados excelente! Pode ganhar % do rake dos jogadores que convidar. Aceda a "Afiliados" no seu dashboard para gerar o seu link e começar a partilhar.'
    },
    {
        keywords: ['senha', 'password', 'acesso', 'login', 'entrar', 'recuperar'],
        response: 'Se perdeu a sua palavra-passe, pode usar a opção "Esqueci-me da password" na janela de Login para receber um email de recuperação.'
    },
    {
        keywords: ['regras', 'sueca', 'jogar', 'como', 'funciona'],
        response: 'A Sueca joga-se com 4 jogadores divididos em 2 equipas de 2. O objetivo é somar pontos conseguindo vencer as vazas onde há cartas valiosas (Ás=11, Sete=10, Rei=4, Valete=3, Dama=2). Consulte a nossa página de regras no rodapé para mais detalhes!'
    }
]

export function getBotResponse(userMessage: string): string | null {
    const msg = userMessage.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")

    // Procura por keywords
    for (const faq of botFaqResponses) {
        if (faq.keywords.some(keyword => msg.includes(keyword))) {
            return `[Bot Automatizado] 👋 Olá! Reparei que mencionou algo relacionado com as nossas FAQs:\n\n${faq.response}\n\nSe isto não respondeu à sua questão, aguarde um momento. Um assistente humano irá falar consigo em breve.`
        }
    }

    return null
}
