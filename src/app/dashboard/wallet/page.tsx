import { createClient } from '@/lib/supabase/server'
import { WalletOverview } from '@/components/dashboard/wallet-overview'
import { redirect } from 'next/navigation'

export default async function WalletPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', user.id)
        .single()

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">A Minha Carteira</h1>
            <WalletOverview initialBalance={wallet?.balance || 0} userId={user.id} />
        </div>
    )
}
