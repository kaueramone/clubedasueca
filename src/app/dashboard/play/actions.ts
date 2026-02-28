'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { generateDeck, shuffleDeck } from '@/features/game/utils'

export async function createGame(prevState: any, formData: FormData) {
    const supabase = await createClient()
    const stake = parseFloat(formData.get('stake') as string)

    if (isNaN(stake) || stake <= 0) {
        return { error: 'Valor de aposta inválido' }
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) return { error: 'Não autenticado' }

    // Atomic create game via RPC
    const { data, error } = await supabase.rpc('process_create_game', {
        p_user_id: user.id,
        p_stake: stake,
    })

    if (error) {
        console.error('[CREATE_GAME]', error)
        return { error: error.message || 'Erro ao criar mesa.' }
    }

    const gameId = data?.game_id
    if (!gameId) {
        return { error: 'Erro ao criar mesa.' }
    }

    revalidatePath('/dashboard/play')
    redirect(`/dashboard/play/${gameId}`)
}

export async function joinGame(gameId: string, formData?: FormData) {
    if (!gameId || gameId === 'undefined') {
        return { error: 'ID da mesa inválido.' }
    }
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: "Não autenticado" }

    const preferredTeam = formData?.get('team') as string || null

    // Atomic join game via RPC
    const { data, error } = await supabase.rpc('process_join_game', {
        p_user_id: user.id,
        p_game_id: gameId,
        p_preferred_team: preferredTeam
    })

    if (error) {
        console.error('[JOIN_GAME]', error)
        return { error: error.message || 'Erro ao entrar na mesa.' }
    }

    // If this was the 4th player + game just started → deal cards
    if (data?.game_started) {
        await dealCards(supabase, gameId)
    }

    revalidatePath(`/dashboard/play/${gameId}`)
    redirect(`/dashboard/play/${gameId}`)
}

/**
 * Distribui as cartas: gera baralho, baralha, distribui 10 cartas por jogador,
 * e define o naipe trunfo (última carta do dealer).
 */
async function dealCards(supabase: any, gameId: string) {
    // Generate and shuffle deck
    const deck = shuffleDeck(generateDeck())

    // Get all players ordered by position
    const { data: players } = await supabase
        .from('game_players')
        .select('id, position')
        .eq('game_id', gameId)
        .order('position', { ascending: true })

    if (!players || players.length !== 4) {
        console.error('[DEAL] Expected 4 players, got', players?.length)
        return
    }

    // Deal 10 cards to each player
    for (let i = 0; i < 4; i++) {
        const hand = deck.slice(i * 10, (i + 1) * 10)
        await supabase
            .from('game_players')
            .update({ hand })
            .eq('id', players[i].id)
    }

    // Trump suit: determined by the last card of the dealer (position 0)
    const lastCard = deck[9] // Last card of player 0's hand
    const trumpSuit = lastCard.split('-')[0] // e.g. 'hearts-A' → 'hearts'

    // Update game with trump suit and set turn to position 1 (right of dealer)
    await supabase
        .from('games')
        .update({
            trump_suit: trumpSuit,
            current_turn: 1,
            current_trick: 1,
            current_round: 1,
            score_a: 0,
            score_b: 0,
        })
        .eq('id', gameId)
}
