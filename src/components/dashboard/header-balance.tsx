'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function HeaderBalance({ initialBalance, userId }: { initialBalance: number, userId: string }) {
    const [balance, setBalance] = useState(initialBalance)
    const supabase = createClient()

    useEffect(() => {
        setBalance(initialBalance)
    }, [initialBalance])

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel(`header-wallet-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wallets',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    if (payload.new && typeof payload.new.balance === 'number') {
                        setBalance(payload.new.balance)
                    }
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    return (
        <div className="flex flex-col items-end">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Saldo</span>
            <span className="text-sm font-bold text-accent">€ {balance.toFixed(2)}</span>
        </div>
    )
}
