'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function cancelGame(gameId: string) {
    if (!gameId || gameId === 'undefined') {
        return { error: 'ID da mesa inválido.' }
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Não autenticado" }

    const { data, error } = await supabase.rpc('process_cancel_game', {
        p_game_id: gameId,
        p_user_id: user.id
    })

    if (error) {
        console.error('[CANCEL_GAME]', error)
        return { error: error.message || 'Erro ao cancelar mesa.' }
    }

    revalidatePath('/dashboard/play')
    redirect('/dashboard/play')
}

export async function leaveGame(gameId: string) {
    if (!gameId || gameId === 'undefined') {
        return { error: 'ID da mesa inválido.' }
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Não autenticado" }

    const { data, error } = await supabase.rpc('process_leave_game', {
        p_game_id: gameId,
        p_user_id: user.id
    })

    if (error) {
        console.error('[LEAVE_GAME]', error)
        return { error: error.message || 'Erro ao abandonar mesa.' }
    }

    revalidatePath('/dashboard/play')
    redirect('/dashboard/play')
}

export async function playCard(gameId: string, card: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }
    const { data, error } = await supabase.rpc('process_play_card', {
        p_game_id: gameId, p_card: card, p_acting_user_id: user.id,
    })
    if (error || data?.error) return { error: error?.message || data.error }
    revalidatePath('/dashboard/play/' + gameId)
    return { success: true }
}

export async function playTimeoutCard(gameId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }
    const { data, error } = await supabase.rpc('process_turn_timeout', { p_game_id: gameId })
    if (error || data?.error) return { error: error?.message || data.error }
    return { success: true }
}

// TABLE INVITES
// ============================================

export async function getFriendsForInvite() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: friendships } = await supabase
        .from('friendships')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'accepted')

    if (!friendships || friendships.length === 0) return []

    const friendIds = friendships.map((f: any) =>
        f.user1_id === user.id ? f.user2_id : f.user1_id
    )

    const { data: profiles } = await supabase
        .from('public_profiles')
        .select('id, username, avatar_url')
        .in('id', friendIds)

    if (!profiles) return []

    return profiles.map((p: any) => ({
        id: p.id,
        username: p.username || 'Jogador',
        avatar_url: p.avatar_url || null,
    }))
}

export async function sendTableInvite(gameId: string, toUserId: string, team?: 'A' | 'B') {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    // Check game is still open
    const { data: game } = await supabase
        .from('games')
        .select('status, host_id')
        .eq('id', gameId)
        .single()

    if (!game || game.status !== 'waiting') return { error: 'Mesa já não está disponível' }
    if (game.host_id !== user.id) return { error: 'Apenas o anfitrião pode convidar' }

    // Delete any existing invite to guarantee a fresh INSERT (so realtime fires)
    await supabase.from('table_invites').delete()
        .eq('game_id', gameId).eq('to_user_id', toUserId)

    const { error } = await supabase.from('table_invites').insert({
        game_id: gameId,
        from_user_id: user.id,
        to_user_id: toUserId,
        team: team || null,
        status: 'pending',
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    if (error) return { error: error.message }
    return { success: true }
}

export async function respondTableInvite(inviteId: string, accept: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: invite } = await supabase
        .from('table_invites')
        .select('game_id, to_user_id, team, games(stake)')
        .eq('id', inviteId)
        .single()

    if (!invite || invite.to_user_id !== user.id) return { error: 'Convite inválido' }

    if (accept) {
        const stake = (invite.games as any)?.stake || 0
        if (stake > 0) {
            const { data: wallet } = await supabase
                .from('wallets')
                .select('balance')
                .eq('user_id', user.id)
                .single()

            if (!wallet || wallet.balance < stake) {
                return {
                    error: 'Saldo insuficiente',
                    required: stake,
                    balance: wallet?.balance || 0,
                }
            }
        }

        // Actually join the game with the correct team from the invite
        const { data: joinData, error: joinError } = await supabase.rpc('process_join_game', {
            p_user_id: user.id,
            p_game_id: invite.game_id,
            p_preferred_team: invite.team || null,
        })

        if (joinError) {
            return { error: joinError.message || 'Erro ao entrar na mesa.' }
        }

        // NÃO distribuir aqui. O process_join_game (migração 099) já distribui
        // as cartas DENTRO da mesma transação quando entra o 4º jogador
        // (devolve game_started + dealt). Chamar dealCardsForGame aqui
        // re-embaralhava as mãos com um baralho diferente, fora de transação —
        // o jogador via a mão mudar e, se falhasse a meio dos 4 UPDATEs,
        // ficavam mãos de baralhos distintos (cartas duplicadas) na mesma mesa.
        // Ver src/app/dashboard/play/actions.ts, que já tinha esta nota.
    }

    await supabase
        .from('table_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId)

    if (accept) {
        return { success: true, gameId: invite.game_id }
    }
    return { success: true }
}
