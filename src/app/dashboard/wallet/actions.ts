'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { checkDepositBonuses } from '@/features/bonuses/actions'
import { trackUserMetrics } from '@/features/crm/actions'

export async function deposit(formData: FormData) {
    const supabase = await createClient()
    const amount = parseFloat(formData.get('amount') as string)

    if (isNaN(amount) || amount <= 0) {
        return { error: 'Valor inválido' }
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Utilizador não autenticado' }
    }

    // Atomic deposit via RPC
    const { data, error } = await supabase.rpc('process_deposit', {
        p_user_id: user.id,
        p_amount: amount,
    })

    if (error) {
        console.error('[DEPOSIT]', error)
        return { error: error.message || 'Erro ao processar depósito' }
    }

    // Check and apply any deposit bonuses (non-blocking)
    checkDepositBonuses(user.id, amount).catch(err => {
        console.error('[DEPOSIT_BONUS]', err)
    })

    // Track metrics (CRM)
    trackUserMetrics(user.id, { deposited: amount }).catch(err => {
        console.error('[DEPOSIT_CRM]', err)
    })

    revalidatePath('/dashboard/wallet')
    return { success: true, new_balance: data?.new_balance }
}

export async function requestWithdrawal(formData: FormData) {
    const supabase = await createClient()
    const amount = parseFloat(formData.get('amount') as string)
    const pixKey = formData.get('pixKey') as string

    if (isNaN(amount) || amount < 10) {
        return { error: 'O valor mínimo de levantamento é 10€' }
    }

    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return { error: 'Utilizador não autenticado' }
    }

    // Atomic withdrawal via RPC
    const { data, error } = await supabase.rpc('process_withdrawal', {
        p_user_id: user.id,
        p_amount: amount,
        p_pix_key: pixKey,
    })

    if (error) {
        console.error('[WITHDRAWAL]', error)
        return { error: error.message || 'Erro ao solicitar levantamento' }
    }

    revalidatePath('/', 'layout')
    return { success: true }
}
