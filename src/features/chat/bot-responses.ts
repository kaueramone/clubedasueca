export const botFaqResponses = [
    {
        keywords: ['deposito', 'depositar', 'mpesa', 'm-pesa', 'emola', 'e-mola', 'mkesh', 'pagamento', 'saldo', 'carteira', 'dinheiro'],
        response: 'No beta, adicione créditos de teste gratuitamente na Carteira. Não há cobrança, pagamentos móveis nem valor monetário. Todos os saldos serão repostos a zero no lançamento oficial.'
    },
    {
        keywords: ['levantamento', 'levantar', 'saque', 'sacar', 'receber'],
        response: 'Não há levantamentos no beta. Os créditos são fictícios e não podem ser convertidos em dinheiro. Não envie PIN nem dados financeiros.'
    },
    {
        keywords: ['bonus', 'bónus', 'promo', 'promocao', 'codigo', 'rollover'],
        response: 'Bónus nesta fase são apenas créditos fictícios, sem valor monetário, e serão repostos a zero no lançamento oficial.'
    },
    {
        keywords: ['afiliado', 'referenciais', 'amigo', 'convidar', 'comissao', 'cpa', 'revshare'],
        response: 'O programa de convites está em teste. As comissões do beta são fictícias e não representam pagamentos reais.'
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
    const msg = userMessage.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")

    // Procura por keywords
    for (const faq of botFaqResponses) {
        if (faq.keywords.some(keyword => msg.includes(keyword))) {
            return `[Bot Automatizado] 👋 Olá! Reparei que mencionou algo relacionado com as nossas FAQs:\n\n${faq.response}\n\nO seu pedido está também na fila de suporte. Pode acompanhar a resposta no painel; não há prazo garantido durante o beta.`
        }
    }

    return null
}
