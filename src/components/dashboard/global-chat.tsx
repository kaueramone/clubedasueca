'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGlobalMessages, sendGlobalMessage } from '@/features/global-chat/actions'
import { Send, MessageSquare, Gamepad2 } from 'lucide-react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface GlobalMessage {
    id: string
    content: string
    created_at: string
    user_id: string
    username: string
    avatar_url: string | null
    game_count: number
}

export function GlobalChat({ currentUserId }: { currentUserId: string }) {
    const [messages, setMessages] = useState<GlobalMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        getGlobalMessages().then(setMessages)
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        const channel = supabase
            .channel('global-chat')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'global_messages' },
                async (payload) => {
                    // Fetch the full message with profile
                    const { data } = await supabase
                        .from('global_messages')
                        .select('id, content, created_at, user_id, profiles!inner(username, avatar_url)')
                        .eq('id', payload.new.id)
                        .single()

                    if (data) {
                        const newMsg: GlobalMessage = {
                            id: data.id,
                            content: data.content,
                            created_at: data.created_at,
                            user_id: data.user_id,
                            username: (data.profiles as any)?.username || 'Jogador',
                            avatar_url: (data.profiles as any)?.avatar_url || null,
                            game_count: 0,
                        }
                        setMessages(prev => {
                            const updated = [...prev.filter(m => m.id !== newMsg.id), newMsg]
                            return updated.slice(-10) // Keep last 10
                        })
                    }
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase])

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || sending) return

        setSending(true)
        const text = newMessage
        setNewMessage('')
        await sendGlobalMessage(text)
        setSending(false)
    }

    const formatTime = (ts: string) =>
        new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    return (
        <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-primary/5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <MessageSquare className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-foreground text-sm">Chat da Sala</h3>
                <span className="ml-auto text-[10px] text-muted-foreground font-medium">últimas 10 mensagens</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Sem mensagens ainda.</p>
                        <p className="text-xs text-muted-foreground">Sê o primeiro a dizer olá!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === currentUserId
                        return (
                            <div key={msg.id} className={cn("flex items-start gap-2", isMe && "flex-row-reverse")}>
                                {/* Avatar */}
                                <div className="shrink-0 w-8 h-8 rounded-full overflow-hidden bg-muted border border-border">
                                    {msg.avatar_url ? (
                                        <Image src={msg.avatar_url} alt={msg.username} width={32} height={32} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary text-xs font-bold">
                                            {msg.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className={cn("flex flex-col gap-0.5 max-w-[75%]", isMe && "items-end")}>
                                    {/* Name + Game count */}
                                    <div className={cn("flex items-center gap-1.5", isMe && "flex-row-reverse")}>
                                        <span className="text-[11px] font-bold text-foreground">{isMe ? 'Você' : msg.username}</span>
                                        {msg.game_count > 0 && (
                                            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                                <Gamepad2 className="w-2.5 h-2.5" />
                                                {msg.game_count}
                                            </span>
                                        )}
                                        <span className="text-[9px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                                    </div>

                                    {/* Bubble */}
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-2xl text-sm leading-snug shadow-sm",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : "bg-muted text-foreground rounded-tl-sm"
                                    )}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 border-t border-border bg-background">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Diz olá à comunidade..."
                        maxLength={200}
                        className="flex-1 bg-muted border border-border text-foreground text-sm rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all placeholder:text-muted-foreground"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-8 h-8 flex items-center justify-center bg-accent text-accent-foreground rounded-full hover:bg-accent/90 disabled:opacity-40 transition-colors shadow-sm shrink-0"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </form>
        </div>
    )
}
