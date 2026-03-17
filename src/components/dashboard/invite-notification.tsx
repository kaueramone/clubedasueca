'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { respondTableInvite } from '@/features/game/actions'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Users, X, Check } from 'lucide-react'

interface Invite {
    id: string
    game_id: string
    from_user_id: string
    from_username: string
    from_avatar: string | null
    expires_at: string
}

export function InviteNotification({ userId }: { userId: string }) {
    const [invites, setInvites] = useState<Invite[]>([])
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const playSound = useCallback(() => {
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio('/audio/chips-collide-1.ogg')
            }
            audioRef.current.currentTime = 0
            audioRef.current.volume = 0.7
            audioRef.current.play().catch(() => {})
        } catch {}
    }, [])

    useEffect(() => {
        const channel = supabase
            .channel(`invite-notify-${userId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'table_invites',
                    filter: `to_user_id=eq.${userId}`,
                },
                async (payload) => {
                    const inv = payload.new as any
                    if (new Date(inv.expires_at) < new Date()) return

                    // Fetch sender profile
                    const { data: profile } = await supabase
                        .from('profiles')
                        .select('username, avatar_url')
                        .eq('id', inv.from_user_id)
                        .single()

                    const newInvite: Invite = {
                        id: inv.id,
                        game_id: inv.game_id,
                        from_user_id: inv.from_user_id,
                        from_username: profile?.username || 'Jogador',
                        from_avatar: profile?.avatar_url || null,
                        expires_at: inv.expires_at,
                    }

                    setInvites(prev => [...prev.filter(i => i.id !== newInvite.id), newInvite])
                    playSound()
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [userId, supabase, playSound])

    // Auto-expire invites client-side
    useEffect(() => {
        const interval = setInterval(() => {
            const now = new Date()
            setInvites(prev => prev.filter(i => new Date(i.expires_at) > now))
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    const handleAccept = async (invite: Invite) => {
        setInvites(prev => prev.filter(i => i.id !== invite.id))
        const res = await respondTableInvite(invite.id, true)
        if (res?.gameId) {
            router.push(`/dashboard/play/${res.gameId}`)
        }
    }

    const handleDecline = async (invite: Invite) => {
        setInvites(prev => prev.filter(i => i.id !== invite.id))
        await respondTableInvite(invite.id, false)
    }

    if (invites.length === 0) return null

    return (
        <div className="fixed bottom-24 md:bottom-6 right-4 z-[200] flex flex-col gap-3 items-end">
            {invites.map((invite) => (
                <div
                    key={invite.id}
                    className="bg-card border border-accent/40 rounded-2xl shadow-2xl p-4 w-72 animate-in slide-in-from-right-4 fade-in duration-300"
                >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                                {invite.from_avatar ? (
                                    <Image src={invite.from_avatar} alt={invite.from_username} width={32} height={32} className="object-cover w-full h-full" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                                        {invite.from_username.charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground font-medium">Convite de Mesa</p>
                                <p className="text-sm font-bold text-foreground leading-tight">{invite.from_username}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => handleDecline(invite)}
                            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted shrink-0 mt-0.5"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-accent" />
                        Quer que te juntes à mesa dele!
                    </p>

                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDecline(invite)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold border border-border text-muted-foreground hover:bg-muted transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                            Recusar
                        </button>
                        <button
                            onClick={() => handleAccept(invite)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors shadow-sm"
                        >
                            <Check className="w-3.5 h-3.5" />
                            Aceitar
                        </button>
                    </div>

                    {/* Expiry bar */}
                    <InviteExpiry expiresAt={invite.expires_at} />
                </div>
            ))}
        </div>
    )
}

function InviteExpiry({ expiresAt }: { expiresAt: string }) {
    const [pct, setPct] = useState(100)

    useEffect(() => {
        const total = new Date(expiresAt).getTime() - Date.now()
        if (total <= 0) { setPct(0); return }

        const interval = setInterval(() => {
            const remaining = new Date(expiresAt).getTime() - Date.now()
            setPct(Math.max(0, (remaining / total) * 100))
            if (remaining <= 0) clearInterval(interval)
        }, 500)
        return () => clearInterval(interval)
    }, [expiresAt])

    return (
        <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
            <div
                className="h-full rounded-full bg-accent transition-all duration-500"
                style={{ width: `${pct}%` }}
            />
        </div>
    )
}
