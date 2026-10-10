export type CommunityMessage = { id: string; user_id: string; content: string; created_at: string }
export type CommunityProfile = { id: string; username: string | null }
export type BotConversation = {
    history: { speaker: string; text: string }[]
    latest: { speaker: string; text: string; addressedToPlayer: boolean }
}

/** Minimise public-chat data sent to providers. No account IDs, emails or secrets. */
export function redactChat(text: string): string {
    return text.slice(0, 500)
        .replace(/https?:\/\/\S+/gi, '[link omitido]')
        .replace(/\bsk-[a-z0-9_-]+/gi, '[credencial omitida]')
        .replace(/\bBearer\s+\S+/gi, '[credencial omitida]')
        .replace(/\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, '[token omitido]')
        .replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[email omitido]')
        .replace(/(?:\+?\d[\s()-]*){8,}/g, '[número omitido]')
        .replace(/((?:senha|password|pin|token)\s*[:=]\s*)\S+/gi, '$1[omitido]')
}

const normalise = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function buildConversation(latest: CommunityMessage, history: CommunityMessage[], profiles: CommunityProfile[], botId: string): BotConversation {
    const participants = new Map<string, string>()
    const speaker = (id: string) => {
        if (id === botId) return 'Sueca Bot'
        if (!participants.has(id)) participants.set(id, `Jogador ${participants.size + 1}`)
        return participants.get(id)!
    }
    const safeHistory = history.filter(m => m.id !== latest.id && Date.parse(m.created_at) <= Date.parse(latest.created_at)).slice(-23)
    for (const message of [...safeHistory, latest]) speaker(message.user_id)
    const mentionsBot = /\b(?:bot|assistente|robo|sueca bot)\b/.test(normalise(latest.content))
    const addressedToPlayer = !mentionsBot && (/@(?!sueca\b|bot\b)[\p{L}\d_]+/u.test(latest.content.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, ''))
        || profiles.some(p => p.id !== latest.user_id && p.id !== botId && p.username && [',', ':'].some(mark => normalise(latest.content.trim()).startsWith(normalise(p.username!) + mark))))
    const text = (content: string) => {
        let result = redactChat(content)
        for (const p of profiles) {
            if (!p.username || p.username.length < 2) continue
            const escaped = p.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            result = result.replace(new RegExp(`(?<![\\p{L}\\d_])@?${escaped}(?![\\p{L}\\d_])`, 'giu'), speaker(p.id))
        }
        return result
    }
    return {
        history: safeHistory.map(m => ({ speaker: speaker(m.user_id), text: text(m.content) })),
        latest: { speaker: speaker(latest.user_id), text: text(latest.content), addressedToPlayer },
    }
}
