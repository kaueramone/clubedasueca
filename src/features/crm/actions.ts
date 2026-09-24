'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ADMIN ACTIONS
// ============================================

/**
 * Obter todos os utilizadores com métricas (CRM Dashboard)
 */
export async function getCrmUsers(filters?: { segment?: string, search?: string }) {
    const supabase = await createClient()

    let query = supabase
        .from('user_metrics')
        .select(`
            *,
            profile:profiles!user_id(username, email, role, avatar_url)
        `)
        .order('ltv', { ascending: false })

    if (filters?.segment && filters.segment !== 'all') {
        query = query.eq('segment', filters.segment)
    }

    const { data, error } = await query

    if (error) return { error: error.message }

    // Filter by search term in memory (since it's a join field)
    let finalData = data || []
    if (filters?.search) {
        const term = filters.search.toLowerCase()
        finalData = finalData.filter(u =>
            (u.profile as any)?.username?.toLowerCase().includes(term) ||
            (u.profile as any)?.email?.toLowerCase().includes(term)
        )
    }

    return { users: finalData }
}

/**
 * Listar regras de automação
 */
export async function getAutomationRules() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('email_automation_rules')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) return { error: error.message }
    return { rules: data }
}

/**
 * Criar/Atualizar regra de automação
 */
export async function saveAutomationRule(formData: FormData, ruleId?: string) {
    const supabase = await createClient()

    const ruleData = {
        name: formData.get('name') as string,
        trigger: formData.get('trigger') as string,
        subject: formData.get('subject') as string,
        body_template: formData.get('body_template') as string,
        segment: formData.get('segment') as string || 'all',
        is_active: formData.get('is_active') === 'on' || formData.get('is_active') === 'true',
    }

    let error;

    if (ruleId) {
        const res = await supabase.from('email_automation_rules').update(ruleData).eq('id', ruleId)
        error = res.error
    } else {
        const res = await supabase.from('email_automation_rules').insert(ruleData)
        error = res.error
    }

    if (error) return { error: error.message }

    revalidatePath('/admin/crm')
    return { success: true }
}

/**
 * Listar logs de email recentes
 */
export async function getEmailLogs(limit = 50) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('email_logs')
        .select(`
            *,
            profile:profiles!user_id(username, email),
            rule:email_automation_rules!rule_id(name)
        `)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) return { error: error.message }
    return { logs: data }
}
