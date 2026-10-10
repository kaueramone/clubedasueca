'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'
import { validateBanner } from './model'

async function adminContext() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role,is_banned').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin' || profile.is_banned) return null
  return { supabase, user }
}

function refreshBanners() {
  revalidatePath('/admin/banners')
  revalidatePath('/dashboard')
}

export async function getActiveBanners(position = 'dashboard_top') {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data, error } = await supabase.from('banners').select('*')
    .eq('is_active', true).eq('position', position)
    .or(`start_date.is.null,start_date.lte.${now}`)
    .or(`end_date.is.null,end_date.gt.${now}`)
    .order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(100)
  return error ? { error: 'Não foi possível carregar os banners.' } : { banners: data || [] }
}

export async function trackBannerClick(bannerId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }
  const { data, error } = await supabase.rpc('record_banner_click', { p_banner_id: bannerId })
  return error || !data ? { error: 'Clique não registado.' } : { success: true }
}

export async function getAllBanners() {
  const context = await adminContext()
  if (!context) return { error: 'Sem permissão.' }
  const { data, error } = await context.supabase.from('banners').select('*')
    .order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(100)
  return error ? { error: 'Não foi possível carregar os banners.' } : { banners: data || [] }
}

export async function saveBanner(bannerId: string | null, formData: FormData) {
  const context = await adminContext()
  if (!context) return { error: 'Sem permissão.' }
  const parsed = validateBanner(Object.fromEntries(formData.entries()))
  if (!parsed.data) return { error: parsed.error }
  if (!bannerId && parsed.data.template === 'image') return { error: 'Selecione um dos três modelos para o novo banner.' }
  const { supabase, user } = context
  const content = { ...parsed.data, start_date: parsed.data.start_date || new Date().toISOString(), updated_at: new Date().toISOString() }
  const query = bannerId
    ? supabase.from('banners').update(content).eq('id', bannerId)
    : supabase.from('banners').insert({ ...content, position: 'dashboard_top', target_segment: 'all', priority: 0, is_active: true })
  const { data, error } = await query.select('id').single()
  if (error || !data) return { error: 'Não foi possível guardar o banner.' }
  await logAudit(supabase, { userId: user.id, action: bannerId ? 'update_banner' : 'create_banner', entityType: 'banner', entityId: data.id, details: content })
  refreshBanners()
  return { success: true, banner: data }
}

export async function createBanner(formData: FormData) {
  return saveBanner(null, formData)
}

export async function updateBanner(bannerId: string, updates: { is_active: boolean }) {
  const context = await adminContext()
  if (!context) return { error: 'Sem permissão.' }
  if (typeof updates?.is_active !== 'boolean') return { error: 'Estado inválido.' }
  const { supabase, user } = context
  const { data, error } = await supabase.from('banners').update({ is_active: updates.is_active, updated_at: new Date().toISOString() }).eq('id', bannerId).select('id').single()
  if (error || !data) return { error: 'Não foi possível alterar o estado do banner.' }
  await logAudit(supabase, { userId: user.id, action: 'update_banner', entityType: 'banner', entityId: bannerId, details: { is_active: updates.is_active } })
  refreshBanners()
  return { success: true }
}

export async function deleteBanner(bannerId: string) {
  const context = await adminContext()
  if (!context) return { error: 'Sem permissão.' }
  const { supabase, user } = context
  const { data, error } = await supabase.from('banners').delete().eq('id', bannerId).select('id').single()
  if (error || !data) return { error: 'Não foi possível eliminar o banner.' }
  await logAudit(supabase, { userId: user.id, action: 'delete_banner', entityType: 'banner', entityId: bannerId })
  refreshBanners()
  return { success: true }
}

export async function getBannerStats(bannerId: string) {
  const context = await adminContext()
  if (!context) return { error: 'Sem permissão.' }
  const { supabase } = context
  const [{ data: banner }, { count }] = await Promise.all([
    supabase.from('banners').select('*').eq('id', bannerId).single(),
    supabase.from('banner_clicks').select('id', { count: 'exact', head: true }).eq('banner_id', bannerId),
  ])
  return { banner, clicks: count || 0, impressions: banner?.impressions || 0, ctr: banner?.impressions ? ((count || 0) / banner.impressions * 100).toFixed(2) : '0.00' }
}
