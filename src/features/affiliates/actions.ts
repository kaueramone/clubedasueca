'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

// ============================================
// AFFILIATE USER ACTIONS
// ============================================

/**
 * Candidatura a afiliado
 */
export async function applyForAffiliate() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    // Check if already applied
    const { data: existing } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('user_id', user.id)
        .single()

    if (existing) {
        return { error: `Candidatura já submetida (estado: ${existing.status})` }
    }

    const { data, error } = await supabase.from('affiliates').insert({
        user_id: user.id,
        status: 'pending',
    }).select().single()

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'affiliate_application',
        entityType: 'affiliate',
        entityId: data.id,
    })

    return { success: true, affiliate: data }
}

/**
 * Obter estado do afiliado
 */
export async function getAffiliateStatus() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: affiliate } = await supabase
        .from('affiliates')
        .select('*')
        .eq('user_id', user.id)
        .single()

    if (!affiliate) return { affiliate: null }

    // Get links
    const { data: links } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })

    // Get referrals
    const { data: referrals } = await supabase
        .from('affiliate_referrals')
        .select(`
            *,
            referred_user:profiles!referred_user_id(username)
        `)
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })

    // Get commissions
    const { data: commissions } = await supabase
        .from('affiliate_commissions')
        .select('*')
        .eq('affiliate_id', affiliate.id)
        .order('created_at', { ascending: false })
        .limit(50)

    // Summary
    const pendingCommissions = (commissions || [])
        .filter(c => c.status === 'pending')
        .reduce((sum, c) => sum + c.amount, 0)

    return {
        affiliate,
        links: links || [],
        referrals: referrals || [],
        commissions: commissions || [],
        summary: {
            total_earned: affiliate.total_earned || 0,
            total_paid: affiliate.total_paid || 0,
            pending: pendingCommissions,
            total_referrals: (referrals || []).length,
            qualified_referrals: (referrals || []).filter(r => r.is_qualified).length,
            total_clicks: (links || []).reduce((sum, l) => sum + l.clicks, 0),
        },
    }
}

/**
 * Criar link de afiliado
 */
export async function createAffiliateLink(code: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data: affiliate } = await supabase
        .from('affiliates')
        .select('id, status')
        .eq('user_id', user.id)
        .single()

    if (!affiliate || affiliate.status !== 'approved') {
        return { error: 'Conta de afiliado não aprovada' }
    }

    const cleanCode = code.toLowerCase().replace(/[^a-z0-9-_]/g, '')
    if (cleanCode.length < 3) {
        return { error: 'Código deve ter pelo menos 3 caracteres (letras, números, - e _)' }
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://apostanasueca.pt'
    const url = `${baseUrl}/?ref=${cleanCode}`

    const { data, error } = await supabase.from('affiliate_links').insert({
        affiliate_id: affiliate.id,
        code: cleanCode,
        url,
    }).select().single()

    if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
            return { error: 'Este código já está em uso' }
        }
        return { error: error.message }
    }

    revalidatePath('/dashboard/affiliates')
    return { success: true, link: data }
}

// ============================================
// INTEGRATION HELPERS
// ============================================

/**
 * Registar referral no signup (chamado pelo auth/actions.ts)
 */
export async function registerReferral(userId: string, refCode: string) {
    const supabase = await createClient()

    const { data, error } = await supabase.rpc('register_affiliate_referral', {
        p_referred_user_id: userId,
        p_ref_code: refCode,
    })

    if (error) {
        console.error('[AFFILIATE_REFERRAL]', error)
    }
    return data
}

/**
 * Processar comissões de afiliados após um jogo (chamado pelo game end)
 */
export async function processGameAffiliateCommissions(gameId: string, houseFee: number) {
    const supabase = await createClient()

    const { error } = await supabase.rpc('process_affiliate_commission', {
        p_game_id: gameId,
        p_house_fee: houseFee,
    })

    if (error) {
        console.error('[AFFILIATE_COMMISSION]', error)
    }
}

/**
 * Track click num link de afiliado
 */
export async function trackAffiliateClick(code: string) {
    const supabase = await createClient()

    const { error } = await supabase.rpc('track_affiliate_click', {
        p_code: code,
    })

    if (error) {
        console.error('[AFFILIATE_CLICK]', error)
    }
}

// ============================================
// ADMIN ACTIONS
// ============================================

/**
 * Listar todos os afiliados (admin)
 */
export async function getAllAffiliates() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('affiliates')
        .select(`
            *,
            profile:profiles!user_id(username)
        `)
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { affiliates: data }
}

/**
 * Aprovar/rejeitar afiliado (admin)
 */
export async function updateAffiliateStatus(affiliateId: string, newStatus: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { error } = await supabase
        .from('affiliates')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', affiliateId)

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: `affiliate_${newStatus}`,
        entityType: 'affiliate',
        entityId: affiliateId,
    })

    revalidatePath('/admin/affiliates')
    return { success: true }
}

/**
 * Pagar comissões de afiliado (admin)
 */
export async function payAffiliate(affiliateId: string, amount: number) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data, error } = await supabase.rpc('pay_affiliate', {
        p_affiliate_id: affiliateId,
        p_amount: amount,
        p_admin_id: user.id,
    })

    if (error) return { error: error.message }

    revalidatePath('/admin/affiliates')
    return { success: true, result: data }
}
