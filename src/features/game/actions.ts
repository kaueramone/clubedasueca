'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidMove, getTrickWinner, getCardSuit, getCardValue } from './utils'
import { logAudit } from '@/lib/audit'
import { processWagerForBonuses } from '@/features/bonuses/actions'
import { processGameAffiliateCommissions } from '@/features/affiliates/actions'
import { trackUserMetrics } from '@/features/crm/actions'
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

export async function playCard(gameId: string, card: string, actingUserId?: string) {
    const supabase = await createClient()
    // actingUserId permite que o watchdog server-side jogue por um jogador AFK.
    // Quando ausente, resolve o utilizador autenticado normalmente.
    let userId = actingUserId
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Não autenticado' }
        userId = user.id
    }
    const userId2 = userId

    // R1: jogada atomica via RPC com lock de mesa (process_play_card).
    // O RPC valida turno/carta/naipe, grava move+hand, calcula a vaza,
    // avanca o turno ou finaliza o jogo (chamando process_game_end) — tudo
    // numa unica transacao, eliminando a corrida do antigo fluxo de 6 chamadas.
    const { data: result, error: rpcError } = await supabase.rpc('process_play_card', {
        p_game_id: gameId,
        p_card: card,
        p_acting_user_id: userId2,
    })

    if (rpcError) {
        console.error('[PLAY_CARD]', rpcError)
        return { error: rpcError.message || 'Erro ao jogar carta.' }
    }
    if (result?.error) {
        return { error: result.error }
    }

    // Efeitos colaterais de fim de jogo (nao-transacionais) ficam em TS,
    // disparados so quando o RPC sinaliza game_over.
    if (result?.game_over) {
        const { data: players } = await supabase
            .from('game_players')
            .select('*')
            .eq('game_id', gameId)

        const wagerAmount = result.stake_amount || 0
        const winnerTeam = result.winner_team as string

        await logAudit(supabase, {
            userId: userId2,
            action: 'game_finished',
            entityType: 'game',
            entityId: gameId,
            details: {
                score_a: result.score_a,
                score_b: result.score_b,
                winner_team: winnerTeam,
                result: result.end_result,
            },
        })

        for (const p of (players || [])) {
            const isWinner = winnerTeam !== 'Draw' && p.team === winnerTeam
            const wonAmount = isWinner ? (wagerAmount * 4 * 0.90) / 2 : 0

            processWagerForBonuses(p.user_id, wagerAmount).catch(err =>
                console.error('[WAGER_BONUS]', err)
            )
            trackUserMetrics(p.user_id, {
                wagered: wagerAmount,
                won: wonAmount,
                games_played: 1,
                games_won: isWinner ? 1 : 0,
            }).catch(err => console.error('[GAME_CRM]', err))
        }

        const houseFee = wagerAmount * 4 * 0.10
        processGameAffiliateCommissions(gameId, houseFee).catch(err =>
            console.error('[AFFILIATE_COMMISSION]', err)
        )
    }

    revalidatePath(`/dashboard/play/${gameId}`)
    return { success: true }
}

export async function playTimeoutCard(gameId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    // 1. Fetch Game State to see whose turn it is
    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (!game || game.status !== 'playing') return { error: 'Jogo inativo' }

    // 2. Fetch Players
    const { data: players } = await supabase.from('game_players').select('*').eq('game_id', gameId)
    if (!players) return { error: 'Jogadores não encontrados' }

    const currentPlayer = players.find(p => p.position === game.current_turn)
    // Se o player atual formos nós, faz play com random
    if (currentPlayer && currentPlayer.user_id === user.id) {
        const hand = currentPlayer.hand || []
        if (hand.length === 0) return { error: 'Sem cartas na mão' }

        // Find what lead suit is
        const { data: moves } = await supabase
            .from('game_moves')
            .select('*')
            .eq('game_id', gameId)
            .eq('round_number', game.current_round || 1)
            .eq('trick_number', game.current_trick || 1)
            .order('played_at', { ascending: true })

        const leadCard = moves && moves.length > 0 ? moves[0] : null
        const leadSuit = leadCard ? getCardSuit(leadCard.card) : null

        const validCards = hand.filter((c: string) => isValidMove(c, hand, leadSuit))
        const cardToPlay = validCards.length > 0 ? validCards[Math.floor(Math.random() * validCards.length)] : hand[0]

        return playCard(gameId, cardToPlay)
    }

    return { error: 'Não podes forçar timeout noutros, apenas podias jogar a tua e passaste do tempo.' }
}

// ============================================
// WATCHDOG SERVER-SIDE: joga automaticamente pelo jogador da vez.
// Usado pela rota /api/games/tick quando um turno fica parado tempo demais,
// independentemente de qualquer client estar conectado.
// Reaproveita a lógica de regras (isValidMove) e o playCard existente.
// ============================================
export async function autoPlayForPlayer(gameId: string) {
    const supabase = await createClient()

    const { data: game } = await supabase.from('games').select('*').eq('id', gameId).single()
    if (!game || game.status !== 'playing') return { error: 'Jogo inativo' }

    const { data: players } = await supabase.from('game_players').select('*').eq('game_id', gameId)
    if (!players) return { error: 'Jogadores não encontrados' }

    const currentPlayer = players.find(p => p.position === game.current_turn)
    if (!currentPlayer) return { error: 'Jogador da vez não encontrado' }

    const hand: string[] = currentPlayer.hand || []
    if (hand.length === 0) return { error: 'Sem cartas na mão' }

    // Descobre o naipe de saída da vaza atual
    const { data: moves } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', gameId)
        .eq('round_number', game.current_round || 1)
        .eq('trick_number', game.current_trick || 1)
        .order('played_at', { ascending: true })

    const leadCard = moves && moves.length > 0 ? moves[0] : null
    const leadSuit = leadCard ? getCardSuit(leadCard.card) : null

    const validCards = hand.filter((c: string) => isValidMove(c, hand, leadSuit))
    const cardToPlay = validCards.length > 0
        ? validCards[Math.floor(Math.random() * validCards.length)]
        : hand[0]

    // Joga POR ESTE jogador (actingUserId), reusando toda a lógica de playCard
    return playCard(gameId, cardToPlay, currentPlayer.user_id)
}


// ============================================
// DEAL CARDS (shared helper)
// ============================================

export async function dealCardsForGame(gameId: string) {
    const { generateDeck, shuffleDeck } = await import('./utils')
    const supabase = await createClient()
    const deck = shuffleDeck(generateDeck())

    const { data: players } = await supabase
        .from('game_players')
        .select('id, position')
        .eq('game_id', gameId)
        .order('position', { ascending: true })

    if (!players || players.length !== 4) return

    for (let i = 0; i < 4; i++) {
        await supabase.from('game_players').update({ hand: deck.slice(i * 10, (i + 1) * 10) }).eq('id', players[i].id)
    }

    const trumpSuit = deck[9].split('-')[0]
    await supabase.from('games').update({
        trump_suit: trumpSuit,
        current_turn: 1,
        current_trick: 1,
        current_round: 1,
        score_a: 0,
        score_b: 0,
        turn_started_at: new Date().toISOString(),
    }).eq('id', gameId)
}

// ============================================
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
        .from('profiles')
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

        if (joinError && !joinData?.already_joined) {
            return { error: joinError.message || 'Erro ao entrar na mesa.' }
        }

        // If 4th player joined, deal cards
        if (joinData?.game_started) {
            await dealCardsForGame(invite.game_id)
        }
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
