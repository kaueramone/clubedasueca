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

export async function playCard(gameId: string, card: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    // 1. Fetch Game State
    const { data: game, error: gameError } = await supabase
        .from('games')
        .select('*')
        .eq('id', gameId)
        .single()

    if (!game || game.status !== 'playing') return { error: 'Jogo não está ativo' }

    // 2. Fetch Players
    const { data: players } = await supabase
        .from('game_players')
        .select('*')
        .eq('game_id', gameId)
        .order('position', { ascending: true })

    if (!players) return { error: 'Jogadores não encontrados' }

    const currentPlayer = players.find(p => p.user_id === user.id)
    if (!currentPlayer) return { error: 'Não é um jogador desta mesa' }

    // 3. Check Turn
    if (game.current_turn !== currentPlayer.position) {
        return { error: 'Não é a sua vez' }
    }

    // 4. Check if card is in hand
    const hand: string[] = currentPlayer.hand || []
    if (!hand.includes(card)) {
        return { error: 'Carta não está na sua mão' }
    }

    // 5. Fetch current trick moves
    const { data: moves } = await supabase
        .from('game_moves')
        .select('*')
        .eq('game_id', gameId)
        .eq('round_number', game.current_round || 1)
        .eq('trick_number', game.current_trick || 1)
        .order('played_at', { ascending: true })

    const trickMoves = moves || []

    // 6. Determine lead suit and validate move
    const leadCard = trickMoves.length > 0 ? trickMoves[0] : null
    const leadSuit = leadCard ? getCardSuit(leadCard.card) : null

    if (!isValidMove(card, hand, leadSuit)) {
        return { error: 'Tens de seguir o naipe de saída!' }
    }

    // 7. Remove card from hand
    const newHand = hand.filter((c: string) => c !== card)
    await supabase.from('game_players').update({ hand: newHand }).eq('id', currentPlayer.id)

    // 8. Insert Move
    await supabase.from('game_moves').insert({
        game_id: gameId,
        player_id: user.id,
        card: card,
        round_number: game.current_round || 1,
        trick_number: game.current_trick || 1,
    })

    // 9. Check if trick is complete (4 cards)
    if (trickMoves.length === 3) {
        // This was the 4th card — trick is complete
        const allTrickCards = [
            ...trickMoves.map(m => ({ player_id: m.player_id, card: m.card })),
            { player_id: user.id, card },
        ]

        // Determine trick winner
        const winnerId = getTrickWinner(allTrickCards, game.trump_suit)
        const winnerPlayer = players.find(p => p.user_id === winnerId)

        if (!winnerPlayer) {
            console.error('[PLAY_CARD] Could not find winner player', winnerId)
            return { error: 'Erro interno ao calcular vencedor da vaza' }
        }

        // Calculate points from trick cards
        const trickPoints = allTrickCards.reduce((sum, c) => sum + getCardValue(c.card), 0)
        const trickCards = allTrickCards.map(c => c.card)

        // Update team score
        const isTeamA = winnerPlayer.team === 'A'
        const newScoreA = (game.score_a || 0) + (isTeamA ? trickPoints : 0)
        const newScoreB = (game.score_b || 0) + (!isTeamA ? trickPoints : 0)

        // Store trick cards in winner's tricks_won
        const currentTricksWon = winnerPlayer.tricks_won || []
        await supabase
            .from('game_players')
            .update({ tricks_won: [...currentTricksWon, ...trickCards] })
            .eq('id', winnerPlayer.id)

        // Check if game is over (10th trick)
        const currentTrick = game.current_trick || 1
        if (currentTrick >= 10) {
            // GAME OVER — use atomic RPC for prize distribution
            const { data: endResult, error: endError } = await supabase.rpc('process_game_end', {
                p_game_id: gameId,
                p_score_a: newScoreA,
                p_score_b: newScoreB,
            })

            if (endError) {
                console.error('[GAME_END]', endError)
                // Fallback: at least mark as finished
                await supabase.from('games').update({
                    status: 'finished',
                    score_a: newScoreA,
                    score_b: newScoreB,
                    winner_team: newScoreA > 60 ? 'A' : (newScoreB > 60 ? 'B' : 'Draw'),
                }).eq('id', gameId)
            }

            await logAudit(supabase, {
                userId: user.id,
                action: 'game_finished',
                entityType: 'game',
                entityId: gameId,
                details: {
                    score_a: newScoreA,
                    score_b: newScoreB,
                    winner_team: newScoreA > 60 ? 'A' : (newScoreB > 60 ? 'B' : 'Draw'),
                    result: endResult,
                },
            })

            // Update bonus wagered and VIP points for all players (non-blocking)
            const wagerAmount = game.stake || 0
            const winnerTeam = newScoreA > 60 ? 'A' : (newScoreB > 60 ? 'B' : 'Draw')
            for (const p of players) {
                // Determine if this player won
                const isWinner = winnerTeam !== 'Draw' && p.team === winnerTeam
                const wonAmount = isWinner ? (wagerAmount * 4 * 0.90) / 2 : 0

                // Bonus
                processWagerForBonuses(p.user_id, wagerAmount).catch(err =>
                    console.error('[WAGER_BONUS]', err)
                )

                // CRM Tracking
                trackUserMetrics(p.user_id, {
                    wagered: wagerAmount,
                    won: wonAmount,
                    games_played: 1,
                    games_won: isWinner ? 1 : 0
                }).catch(err => console.error('[GAME_CRM]', err))
            }

            // Process affiliate commissions from house fee (non-blocking)
            const totalPot = wagerAmount * 4
            const houseFee = totalPot * 0.10
            processGameAffiliateCommissions(gameId, houseFee).catch(err =>
                console.error('[AFFILIATE_COMMISSION]', err)
            )
        } else {
            // Next trick — winner leads
            await supabase.from('games').update({
                current_turn: winnerPlayer.position,
                current_trick: currentTrick + 1,
                score_a: newScoreA,
                score_b: newScoreB,
            }).eq('id', gameId)
        }
    } else {
        // Not last card — advance turn
        const nextPosition = (currentPlayer.position + 1) % 4
        await supabase.from('games').update({
            current_turn: nextPosition,
        }).eq('id', gameId)
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
// TABLE INVITES
// ============================================

export async function getFriendsForInvite() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('friendships')
        .select('friend_id, user_id, profiles!friendships_friend_id_fkey(id, username, avatar_url), profiles2:profiles!friendships_user_id_fkey(id, username, avatar_url)')
        .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
        .eq('status', 'accepted')

    if (!data) return []

    return data.map((f: any) => {
        const isSender = f.user_id === user.id
        const friend = isSender ? f.profiles : f.profiles2
        return {
            id: friend?.id,
            username: friend?.username || 'Jogador',
            avatar_url: friend?.avatar_url || null,
        }
    }).filter((f: any) => f.id)
}

export async function sendTableInvite(gameId: string, toUserId: string) {
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

    const { error } = await supabase
        .from('table_invites')
        .upsert(
            {
                game_id: gameId,
                from_user_id: user.id,
                to_user_id: toUserId,
                status: 'pending',
                expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
            },
            { onConflict: 'game_id,to_user_id' }
        )

    if (error) return { error: error.message }
    return { success: true }
}

export async function respondTableInvite(inviteId: string, accept: boolean) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: invite } = await supabase
        .from('table_invites')
        .select('game_id, to_user_id')
        .eq('id', inviteId)
        .single()

    if (!invite || invite.to_user_id !== user.id) return { error: 'Convite inválido' }

    await supabase
        .from('table_invites')
        .update({ status: accept ? 'accepted' : 'declined' })
        .eq('id', inviteId)

    if (accept) {
        // Redirect handled client-side
        return { success: true, gameId: invite.game_id }
    }
    return { success: true }
}
