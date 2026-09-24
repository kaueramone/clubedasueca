'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

export function UserPresence({ userId }: { userId: string }) {
    const supabase = createClient()

    // Heartbeat persistido: grava last_seen_at no banco enquanto o utilizador
    // está logado. Usado para expirar mesas cujo dono ficou inativo (> 3 min).
    useEffect(() => {
        if (!userId) return

        const touch = () => { supabase.rpc('touch_last_seen').then(() => {}, () => {}) }
        touch() // imediatamente ao montar
        const interval = setInterval(touch, 60_000) // a cada 60s

        return () => clearInterval(interval)
    }, [userId, supabase])

    useEffect(() => {
        if (!userId) return

        const channel = supabase.channel('online-users', {
            config: {
                presence: {
                    key: userId,
                },
            },
        })

        channel
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: userId,
                        online_at: new Date().toISOString(),
                    })
                }
            })

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId, supabase])

    return null // Invisible component
}
