'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export function SessionGuard({ userId, sessionId }: { userId: string; sessionId: string }) {
    const router = useRouter()

    useEffect(() => {
        if (!userId || !sessionId) return
        const supabase = createClient()

        const channel = supabase
            .channel(`session-guard-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${userId}`,
                },
                (payload) => {
                    const newSessionId = payload.new?.session_id
                    if (newSessionId && newSessionId !== sessionId) {
                        // Another device logged in — kill this session
                        supabase.auth.signOut().then(() => {
                            router.push('/login?kicked=1')
                        })
                    }
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId, sessionId, router])

    return null
}
