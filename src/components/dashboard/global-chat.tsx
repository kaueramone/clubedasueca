'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getGlobalMessages, sendGlobalMessage, triggerBotReply } from '@/features/global-chat/actions'
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
    optimistic?: boolean
}

const BOT_USER_ID = process.env.NEXT_PUBLIC_BOT_USER_ID ?? '00000000-0000-0000-0000-000000000001'

export function GlobalChat({
    currentUserId,
    currentUsername,
    currentAvatarUrl,
}: {
    currentUserId: string
    currentUsername: string
    currentAvatarUrl: string | null
}) {
    const [messages, setMessages] = useState<GlobalMessage[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [sending, setSending] = useState(false)
    const messagesContainerRef = useRef<HTMLDivElement>(null)
    const supabaseRef = useRef(createClient())
    const supabase = supabaseRef.current
    // Track last optimistic temp id so Realtime can confirm it precisely
    const pendingTempId = useRef<string | null>(null)
    // Track whether initial messages have loaded — only auto-scroll after that
    const initialLoadDone = useRef(false)

    // Scroll the chat container (not the viewport) to the bottom
    const scrollToBottom = useCallback((smooth = true) => {
        const el = messagesContainerRef.current
        if (!el) return
        el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' })
    }, [])

    // Load initial messages — scroll instantly so viewport stays at top
    useEffect(() => {
        getGlobalMessages().then(msgs => {
            setMessages(msgs)
            // Use rAF to wait for the DOM to paint before scrolling the inner container
            requestAnimationFrame(() => {
                scrollToBottom(false)
                initialLoadDone.current = true
            })
        })
    }, [scrollToBottom])

    // Scroll smoothly when a new message arrives (after initial load)
    useEffect(() => {
        if (!initialLoadDone.current) return
        scrollToBottom(true)
    }, [messages, scrollToBottom])

    // Realtime subscription — only adds messages from OTHER users (own msgs already optimistic)
    useEffect(() => {
        const channel = supabase
            .channel('global-chat')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'global_messages' },
                async (payload) => {
                    const incomingId = payload.new.id
                    const incomingUserId = payload.new.user_id

                    // For own messages: confirm the optimistic entry using the tracked tempId
                    if (incomingUserId === currentUserId) {
                        const tid = pendingTempId.current
                        setMessages(prev => {
                            // If we have a pending optimistic msg, confirm it
                            if (tid && prev.some(m => m.id === tid)) {
                                return prev.map(m =>
                                    m.id === tid
                                        ? { ...m, id: incomingId, optimistic: false, created_at: payload.new.created_at }
                                        : m
                                )
                            }
                            // Fallback: avoid duplicate if already confirmed
                            if (prev.some(m => m.id === incomingId)) return prev
                            return prev
                        })
                        pendingTempId.current = null
                        return
                    }

                    // Fetch full message with profile info
                    const { data } = await supabase
                        .from('global_messages')
                        .select('id, content, created_at, user_id, profiles!inner(username, avatar_url)')
                        .eq('id', incomingId)
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
                            if (prev.some(m => m.id === newMsg.id)) return prev
                            return [...prev, newMsg].slice(-10)
                        })
                    }
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [supabase, currentUserId])

    const handleSend = useCallback(async (e: React.FormEvent) => {
        e.preventDefault()
        const text = newMessage.trim()
        if (!text || sending) return

        setSending(true)
        setNewMessage('')

        // Optimistic update — show message instantly
        const tempId = `optimistic-${Date.now()}`
        pendingTempId.current = tempId
        const optimisticMsg: GlobalMessage = {
            id: tempId,
            content: text,
            created_at: new Date().toISOString(),
            user_id: currentUserId,
            username: currentUsername,
            avatar_url: currentAvatarUrl,
            game_count: 0,
            optimistic: true,
        }
        setMessages(prev => [...prev, optimisticMsg].slice(-10))

        // Send to server
        const result = await sendGlobalMessage(text)

        if (result?.error) {
            // Rollback optimistic message on error
            setMessages(prev => prev.filter(m => m.id !== tempId))
        } else if (result?.success) {
            // Confirm optimistic message immediately with the real id/timestamp
            setMessages(prev => prev.map(m =>
                m.id === tempId
                    ? { ...m, id: result.id, optimistic: false, created_at: result.created_at }
                    : m
            ))
            pendingTempId.current = null

            // Trigger bot as a separate Server Action invocation — this runs as its own
            // full Vercel function call and won't be killed prematurely
            if (result.shouldTriggerBot) {
                triggerBotReply(result.message).catch(() => {})
            }
        }

        setSending(false)
    }, [newMessage, sending, currentUserId, currentUsername, currentAvatarUrl])

    const formatTime = (ts: string) =>
        new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const isBot = (userId: string) => userId === BOT_USER_ID

    return (
        <div className="flex flex-col h-full bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-primary/5">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <MessageSquare className="w-4 h-4 text-accent" />
                <h3 className="font-bold text-foreground text-sm">Chat da Comunidade</h3>
                <span className="ml-auto text-[10px] text-muted-foreground font-medium">últimas 10 mensagens</span>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-6">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/30 mb-2" />
                        <p className="text-sm text-muted-foreground">Sem mensagens ainda.</p>
                        <p className="text-xs text-muted-foreground">Sê o primeiro a dizer olá!</p>
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.user_id === currentUserId
                        const bot = isBot(msg.user_id)
                        return (
                            <div key={msg.id} className={cn("flex items-start gap-2", isMe && "flex-row-reverse")}>
                                {/* Avatar */}
                                <div className={cn(
                                    "shrink-0 w-8 h-8 rounded-full overflow-hidden border",
                                    bot ? "bg-[#0B1F1A] border-accent/40" : "bg-muted border-border"
                                )}>
                                    {bot ? (
                                        <Image src="/images/clubedasueca-fundoescuro-perfil.png" alt="Sueca Bot" width={32} height={32} className="object-cover w-full h-full p-0.5" />
                                    ) : msg.avatar_url ? (
                                        <Image src={msg.avatar_url} alt={msg.username} width={32} height={32} className="object-cover w-full h-full" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xs font-bold bg-primary/10 text-primary">
                                            {msg.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className={cn("flex flex-col gap-0.5 max-w-[75%]", isMe && "items-end")}>
                                    {/* Name + badges */}
                                    <div className={cn("flex items-center gap-1.5", isMe && "flex-row-reverse")}>
                                        <span className="text-[11px] font-bold text-foreground">
                                            {isMe ? 'Você' : msg.username}
                                        </span>
                                        {bot && (
                                            <span className="text-[9px] bg-accent/15 text-accent px-1.5 py-0.5 rounded-full font-semibold">IA</span>
                                        )}
                                        {msg.game_count > 0 && !bot && (
                                            <span className="flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                                                <Gamepad2 className="w-2.5 h-2.5" />
                                                {msg.game_count}
                                            </span>
                                        )}
                                        <span className="text-[9px] text-muted-foreground">
                                            {msg.optimistic ? 'enviando…' : formatTime(msg.created_at)}
                                        </span>
                                    </div>

                                    {/* Bubble */}
                                    <div className={cn(
                                        "px-3 py-1.5 rounded-2xl text-sm leading-snug shadow-sm",
                                        msg.optimistic && "opacity-60",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-tr-sm"
                                            : bot
                                                ? "bg-accent/10 text-foreground border border-accent/20 rounded-tl-sm"
                                                : "bg-muted text-foreground rounded-tl-sm"
                                    )}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-3 pr-4 border-t border-border bg-background">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder="Diz olá à comunidade..."
                        maxLength={200}
                        // text-[16px] prevents iOS auto-zoom on focus (zoom triggers below 16px)
                        className="flex-1 min-w-0 bg-muted border border-border text-foreground text-[16px] leading-tight rounded-full px-4 py-2 outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all placeholder:text-muted-foreground"
                    />
                    <button
                        type="submit"
                        disabled={!newMessage.trim() || sending}
                        className="w-9 h-9 flex-none flex items-center justify-center bg-accent text-accent-foreground rounded-full hover:bg-accent/90 disabled:opacity-40 transition-colors shadow-sm"
                    >
                        <Send className="w-3.5 h-3.5" />
                    </button>
                </div>
            </form>
        </div>
    )
}
