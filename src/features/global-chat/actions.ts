'use server'

import { createClient } from '@/lib/supabase/server'

export async function getGlobalMessages() {
    const supabase = await createClient()

    const { data } = await supabase
        .from('global_messages')
        .select(`
            id,
            content,
            created_at,
            user_id,
            profiles!inner(username, avatar_url)
        `)
        .order('created_at', { ascending: false })
        .limit(10)

    if (!data) return []

    // Fetch multiplayer game count for each user
    const userIds = [...new Set(data.map(m => m.user_id))]
    const { data: gameCounts } = await supabase
        .from('game_players')
        .select('user_id')
        .in('user_id', userIds)
        .eq('games.is_training', false)

    const countMap: Record<string, number> = {}
    if (gameCounts) {
        for (const row of gameCounts) {
            countMap[row.user_id] = (countMap[row.user_id] || 0) + 1
        }
    }

    return data.reverse().map(m => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        user_id: m.user_id,
        username: (m.profiles as any)?.username || 'Jogador',
        avatar_url: (m.profiles as any)?.avatar_url || null,
        game_count: countMap[m.user_id] || 0,
    }))
}

export async function sendGlobalMessage(content: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const text = content.trim().slice(0, 200)
    if (!text) return { error: 'Mensagem vazia' }

    const { error } = await supabase
        .from('global_messages')
        .insert({ user_id: user.id, content: text })

    if (error) return { error: error.message }
    return { success: true }
}
