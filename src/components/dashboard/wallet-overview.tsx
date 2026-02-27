'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react'

export function WalletOverview({
    initialBalance,
    userId
}: {
    initialBalance: number,
    userId: string
}) {
    const [balance, setBalance] = useState(initialBalance)
    const supabase = createClient()

    useEffect(() => {
        setBalance(initialBalance)
    }, [initialBalance])

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel(`wallet-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'wallets',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    console.log('Wallet update:', payload)
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-6 text-white shadow-xl shadow-accent/20">
            <div className="relative z-10">
                <p className="text-sm font-medium opacity-80">Saldo Disponível</p>
                <p className="mt-2 text-4xl font-bold tracking-tight">
                    €{balance.toFixed(2)}
                </p>
            </div>
            <div className="mt-8 flex gap-3">
                <Link
                    href="/dashboard/wallet/deposit"
                    className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/30"
                >
                    <ArrowDownLeft className="h-4 w-4" />
                    Depositar
                </Link>
                <Link
                    href="/dashboard/wallet/withdraw"
                    className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold backdrop-blur-md transition-colors hover:bg-white/30"
                >
                    <ArrowUpRight className="h-4 w-4" />
                    Levantar
                </Link>
            </div>

            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute -bottom-6 -right-6 h-32 w-32 rounded-full bg-white/10 blur-xl" />
        </div>
    )
}
