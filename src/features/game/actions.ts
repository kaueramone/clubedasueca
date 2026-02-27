'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { isValidMove, getTrickWinner, getCardSuit, getCardValue } from './utils'
import { logAudit } from '@/lib/audit'
import { processWagerForBonuses } from '@/features/bonuses/actions'
import { processGameAffiliateCommissions } from '@/features/affiliates/actions'
import { trackUserMetrics } from '@/features/crm/actions'

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
