/**
 * AI layer for the community chat bot (Groq / Llama).
 * Isolated here so the provider/model can be swapped without touching actions.ts.
 */

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `És o assistente oficial do Clube da Sueca, uma plataforma de jogo de Sueca online com apostas reais.
Responde APENAS a perguntas sobre:
- As regras e estratégia do jogo de Sueca
- Como usar a plataforma (depósitos, levantamentos, lobby, mesas, convites)
- Dúvidas sobre a conta, carteira digital e bónus

Regras de resposta:
- Responde sempre em Português (PT ou BR conforme o utilizador)
- Sê breve e direto (máximo 3 frases)
- Se a pergunta não for sobre Sueca ou a plataforma, responde: "Só posso ajudar com dúvidas sobre o jogo de Sueca e a plataforma. 🃏"
- Nunca te faças passar por humano — és um assistente de IA`

export async function getBotReply(userMessage: string): Promise<string | null> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
        console.warn('[Bot] GROQ_API_KEY não configurada — bot desativado')
        return null
    }

    try {
        const res = await fetch(GROQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: userMessage },
                ],
                max_tokens: 150,
                temperature: 0.5,
            }),
        })

        if (!res.ok) {
            console.error('[Bot] Groq error:', res.status, await res.text())
            return null
        }

        const json = await res.json()
        return json.choices?.[0]?.message?.content?.trim() ?? null
    } catch (err) {
        console.error('[Bot] fetch error:', err)
        return null
    }
}
