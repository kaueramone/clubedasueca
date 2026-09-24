'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

// ============================================
// USER-FACING ACTIONS
// ============================================

/**
 * Obter bónus ativos do utilizador
 */
export async function getUserBonuses() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data, error } = await supabase
        .from('user_bonuses')
        .select(`
            *,
            bonus:bonuses(name, type, description)
        `)
        .eq('user_id', user.id)
        .order('activated_at', { ascending: false })

    if (error) return { error: error.message }
    return { bonuses: data }
}

/**
 * Resgatar um código promocional
 */
export async function redeemPromoCode(code: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    if (!code || code.trim().length === 0) {
        return { error: 'Código inválido' }
    }

    const { data, error } = await supabase.rpc('redeem_promo_code', {
        p_user_id: user.id,
        p_code: code.trim().toUpperCase(),
    })

    if (error) {
        console.error('[PROMO_CODE]', error)
        return { error: error.message || 'Erro ao resgatar código' }
    }

    revalidatePath('/', 'layout')
    return { success: true, result: data }
}

/**
 * Obter estado VIP do utilizador
 */
export async function getVipStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: vip } = await supabase
        .from('user_vip')
        .select(`
            *,
            level:vip_levels(*)
        `)
        .eq('user_id', user.id)
        .single()

    const { data: levels } = await supabase
        .from('vip_levels')
        .select('*')
        .order('sort_order', { ascending: true })

    return { vip, levels }
}

/**
 * Obter bónus disponíveis (para listagem pública)
 */
export async function getAvailableBonuses() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bonuses')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { bonuses: data }
}

/**
 * Verificar se utilizador tem free play ativo
 */
export async function hasActiveFreePlay(userId: string): Promise<boolean> {
    const supabase = await createClient()

    const { data } = await supabase
        .from('user_bonuses')
        .select('id')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single()

    // Also check if the linked bonus is of type free_play
    if (!data) return false

    const { data: userBonus } = await supabase
        .from('user_bonuses')
        .select(`
            id,
            bonus:bonuses(type)
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .single()

    return (userBonus?.bonus as any)?.type === 'free_play'
}

// ============================================
// ADMIN ACTIONS
// ============================================

/**
 * Criar um novo bónus (admin)
 */
export async function createBonus(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const bonusData = {
        name: formData.get('name') as string,
        description: formData.get('description') as string || null,
        type: formData.get('type') as string,
        amount: formData.get('amount') ? parseFloat(formData.get('amount') as string) : null,
        percentage: formData.get('percentage') ? parseFloat(formData.get('percentage') as string) : null,
        max_amount: formData.get('max_amount') ? parseFloat(formData.get('max_amount') as string) : null,
        min_deposit: formData.get('min_deposit') ? parseFloat(formData.get('min_deposit') as string) : null,
        rollover_multiplier: parseFloat(formData.get('rollover_multiplier') as string) || 1,
        valid_days: parseInt(formData.get('valid_days') as string) || 30,
        max_uses: formData.get('max_uses') ? parseInt(formData.get('max_uses') as string) : null,
        max_per_user: parseInt(formData.get('max_per_user') as string) || 1,
        user_segment: (formData.get('user_segment') as string) || 'all',
        status: 'active' as const,
    }

    const { data, error } = await supabase.from('bonuses').insert(bonusData).select().single()

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'create_bonus',
        entityType: 'bonus',
        entityId: data.id,
        details: bonusData as any,
    })

    revalidatePath('/admin/bonuses')
    return { success: true, bonus: data }
}

/**
 * Atualizar bónus (admin)
 */
export async function updateBonus(bonusId: string, updates: Record<string, any>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { error } = await supabase
        .from('bonuses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', bonusId)

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'update_bonus',
        entityType: 'bonus',
        entityId: bonusId,
        details: updates,
    })

    revalidatePath('/admin/bonuses')
    return { success: true }
}

/**
 * Listar todos os bónus (admin)
 */
export async function getAllBonuses() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('bonuses')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { bonuses: data }
}

/**
 * Criar promo code (admin)
 */
export async function createPromoCode(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const code = (formData.get('code') as string).trim().toUpperCase()
    const bonusId = formData.get('bonus_id') as string
    const maxRedemptions = formData.get('max_redemptions')
        ? parseInt(formData.get('max_redemptions') as string)
        : null
    const validUntil = formData.get('valid_until') as string || null

    const { data, error } = await supabase.from('promo_codes').insert({
        code,
        bonus_id: bonusId,
        max_redemptions: maxRedemptions,
        valid_until: validUntil,
    }).select().single()

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'create_promo_code',
        entityType: 'promo_code',
        entityId: data.id,
        details: { code, bonus_id: bonusId },
    })

    revalidatePath('/admin/bonuses')
    return { success: true, promoCode: data }
}

/**
 * Listar promo codes (admin)
 */
export async function getAllPromoCodes() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('promo_codes')
        .select(`
            *,
            bonus:bonuses(name, type)
        `)
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { promoCodes: data }
}

/**
 * Aplicar bónus manualmente a um utilizador (admin)
 */
export async function adminApplyBonus(userId: string, bonusId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data, error } = await supabase.rpc('admin_apply_bonus', {
        p_user_id: userId,
        p_bonus_id: bonusId,
    })

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'admin_apply_bonus',
        entityType: 'bonus',
        entityId: bonusId,
        details: { target_user: userId, result: data },
    })

    revalidatePath('/admin/bonuses')
    return { success: true, result: data }
}
