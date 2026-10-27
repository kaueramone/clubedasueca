import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminMfa } from '@/components/admin/admin-mfa'

export const dynamic = 'force-dynamic'

export default async function AdminSecurityPage() {
    const client = await createClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) redirect('/login')
    const { data: profile } = await client.from('profiles').select('role,is_banned').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin' || profile.is_banned) redirect('/dashboard')
    return <div className="max-w-2xl mx-auto py-6"><AdminMfa /></div>
}
