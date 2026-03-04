'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

// ============================================
// PUBLIC / USER ACTIONS
// ============================================

/**
 * Obter banners ativos para uma posição e segmento
 */
export async function getActiveBanners(position: string = 'dashboard_top') {
    const supabase = await createClient()
    const now = new Date().toISOString()

    const { data, error } = await supabase
        .from('banners')
        .select('*')
        .eq('is_active', true)
        .eq('position', position)
        .lte('start_date', now)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order('priority', { ascending: false })

    if (error) return { error: error.message }

    // Increment impressions (non-blocking, batch)
    if (data && data.length > 0) {
        for (const banner of data) {
            supabase
                .from('banners')
                .update({ impressions: (banner.impressions || 0) + 1 })
                .eq('id', banner.id)
                .then()
        }
    }

    return { banners: data || [] }
}

/**
 * Registar click num banner
 */
export async function trackBannerClick(bannerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Insert click record
    await supabase.from('banner_clicks').insert({
        banner_id: bannerId,
        user_id: user?.id || null,
    })

    // Increment counter
    try {
        await supabase.rpc('increment_banner_clicks', { p_banner_id: bannerId })
    } catch {
        // Fallback if RPC doesn't exist
        await supabase
            .from('banners')
            .update({ clicks: 1 }) // This is a simplified fallback
            .eq('id', bannerId)
    }

    return { success: true }
}

// ============================================
// ADMIN ACTIONS
// ============================================

/**
 * Listar todos os banners (admin)
 */
export async function getAllBanners() {
    const supabase = await createClient()

    const { data, error } = await supabase
        .from('banners')
        .select('*')
        .order('priority', { ascending: false })

    if (error) return { error: error.message }
    return { banners: data }
}

/**
 * Criar banner (admin)
 */
export async function createBanner(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    let imageUrl = formData.get('image_url') as string | null
    let mobileImageUrl = formData.get('mobile_image_url') as string | null

    const desktopFile = formData.get('image_file') as File | null
    const mobileFile = formData.get('mobile_image_file') as File | null

    if (desktopFile && desktopFile.size > 0) {
        const ext = desktopFile.name.split('.').pop() || 'png'
        const fileName = `desktop-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, desktopFile)
        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName)
            imageUrl = publicUrl
        }
    }

    if (mobileFile && mobileFile.size > 0) {
        const ext = mobileFile.name.split('.').pop() || 'png'
        const fileName = `mobile-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${ext}`
        const { error: uploadError } = await supabase.storage.from('banners').upload(fileName, mobileFile)
        if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName)
            mobileImageUrl = publicUrl
        }
    }

    const bannerData = {
        title: formData.get('title') as string,
        description: formData.get('description') as string || null,
        image_url: imageUrl,
        mobile_image_url: mobileImageUrl,
        link_url: formData.get('link_url') as string || null,
        position: 'dashboard_top', // Always dashboard top
        priority: 0,
        target_segment: 'all', // Always all
        start_date: formData.get('start_date') as string || new Date().toISOString(),
        end_date: formData.get('end_date') as string || null,
        is_active: true,
    }

    const { data, error } = await supabase.from('banners').insert(bannerData).select().single()

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'create_banner',
        entityType: 'banner',
        entityId: data.id,
        details: bannerData as any,
    })

    revalidatePath('/admin/banners')
    return { success: true, banner: data }
}

/**
 * Atualizar banner (admin)
 */
export async function updateBanner(bannerId: string, updates: Record<string, any>) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { error } = await supabase
        .from('banners')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', bannerId)

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'update_banner',
        entityType: 'banner',
        entityId: bannerId,
        details: updates,
    })

    revalidatePath('/admin/banners')
    return { success: true }
}

/**
 * Deletar banner (admin)
 */
export async function deleteBanner(bannerId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { error } = await supabase.from('banners').delete().eq('id', bannerId)

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'delete_banner',
        entityType: 'banner',
        entityId: bannerId,
    })

    revalidatePath('/admin/banners')
    return { success: true }
}

/**
 * Obter estatísticas de um banner (admin)
 */
export async function getBannerStats(bannerId: string) {
    const supabase = await createClient()

    const { data: banner } = await supabase
        .from('banners')
        .select('*')
        .eq('id', bannerId)
        .single()

    const { count: clickCount } = await supabase
        .from('banner_clicks')
        .select('*', { count: 'exact', head: true })
        .eq('banner_id', bannerId)

    const ctr = banner && banner.impressions > 0
        ? ((clickCount || 0) / banner.impressions * 100).toFixed(2)
        : '0.00'

    return {
        banner,
        clicks: clickCount || 0,
        impressions: banner?.impressions || 0,
        ctr,
    }
}
