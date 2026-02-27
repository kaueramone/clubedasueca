'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { logAudit } from '@/lib/audit'

export async function getAdminStats() {
    const supabase = await createClient()

    // Users Count
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true })

    // Total Balance
    const { data: wallets } = await supabase.from('wallets').select('balance')
    const totalBalance = wallets?.reduce((acc, w) => acc + (w.balance || 0), 0) || 0

    // Total Games
    const { count: gamesCount } = await supabase.from('games').select('*', { count: 'exact', head: true })

    // House Revenue
    const { data: revenue } = await supabase.from('house_revenue').select('amount')
    const totalRevenue = revenue?.reduce((acc, r) => acc + (r.amount || 0), 0) || 0

    return {
        users: usersCount || 0,
        balance: totalBalance,
        games: gamesCount || 0,
        revenue: totalRevenue,
    }
}

export async function getUsers(page = 1, search = '') {
    const supabase = await createClient()
    const from = (page - 1) * 20
    const to = from + 19

    let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)

    if (search) {
        query = query.ilike('username', `%${search}%`)
    }

    const { data, count, error } = await query

    if (error) throw error
    return { users: data, total: count }
}

export async function toggleBanUser(userId: string, currentStatus: boolean) {
    const supabase = await createClient()

    // Verify requester is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
        return { error: 'Sem permissões de administrador' }
    }

    const newStatus = !currentStatus
    const { error } = await supabase.from('profiles').update({ is_banned: newStatus }).eq('id', userId)

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: newStatus ? 'ban_user' : 'unban_user',
        entityType: 'profile',
        entityId: userId,
        details: { target_user: userId, new_status: newStatus },
    })

    revalidatePath('/admin')
    return { success: true }
}

export async function promoteToAdmin(userId: string) {
    const supabase = await createClient()

    // Verify requester is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Not authenticated' }

    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!adminProfile || adminProfile.role !== 'admin') {
        return { error: 'Sem permissões de administrador' }
    }

    const { error } = await supabase.from('profiles').update({ role: 'admin' }).eq('id', userId)

    if (error) return { error: error.message }

    await logAudit(supabase, {
        userId: user.id,
        action: 'promote_admin',
        entityType: 'profile',
        entityId: userId,
        details: { target_user: userId },
    })

    revalidatePath('/admin')
    return { success: true }
}

export async function getTransactions() {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('transactions')
        .select(`
            *,
            wallet:wallets(
                user:profiles(username)
            )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

    if (error) throw error
    return data
}

export async function getAuditLogs(page = 1) {
    const supabase = await createClient()
    const from = (page - 1) * 50
    const to = from + 49

    const { data, error, count } = await supabase
        .from('audit_logs')
        .select(`
            *,
            profile:profiles(username)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

    if (error) throw error
    return { logs: data, total: count }
}
