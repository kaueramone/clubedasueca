'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { dealCardsForGame } from '@/features/game/actions'

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
        await dealCardsForGame(gameId)
    }

    revalidatePath(`/dashboard/play/${gameId}`)
    redirect(`/dashboard/play/${gameId}`)
}

