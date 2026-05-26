'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function OnlineCounter() {
    const [count, setCount] = useState<number | null>(null)

    useEffect(() => {
        const supabase = createClient()
        const channel = supabase.channel('online-users')

        channel
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                setCount(Object.keys(state).length)
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    if (count === null) return null

    return (
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-white/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>{count} online</span>
        </div>
    )
}
