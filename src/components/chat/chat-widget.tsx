'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, User } from 'lucide-react'
import { getUserConversations, startConversation, sendChatMessage, getChatMessages } from '@/features/chat/actions'
import { createClient } from '@/lib/supabase/client'

export default function ChatWidget({ userId }: { userId?: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const [conversations, setConversations] = useState<any[]>([])
    const [activeConv, setActiveConv] = useState<string | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [loading, setLoading] = useState(false)

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => {
        if (isOpen && userId) {
            loadConversations()
        }
    }, [isOpen, userId])

    // Scroll to bottom whenever messages change
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Real-time subscription
    useEffect(() => {
        if (!activeConv) return

        const channel = supabase.channel(`chat_${activeConv}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `conversation_id=eq.${activeConv}` },
                (payload) => {
                    setMessages(prev => [...prev, payload.new])
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeConv])


    async function loadConversations() {
        const res = await getUserConversations()
        if (res.conversations) {
            setConversations(res.conversations)
            // Auto open existing active chat if available
            const active = res.conversations.find(c => c.status !== 'resolved' && c.status !== 'closed')
            if (active) {
                openConversation(active.id)
            }
        }
    }

    async function openConversation(convId: string) {
        setActiveConv(convId)
        const res = await getChatMessages(convId)
        if (res.messages) setMessages(res.messages)
    }

    async function handleStartNew(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        setLoading(true)
        const formData = new FormData(e.currentTarget)
        const msg = formData.get('message') as string

        const res = await startConversation('Suporte', msg)
        if (res.conversationId) {
            openConversation(res.conversationId)
        }
        setLoading(false)
    }

    async function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!newMessage.trim() || !activeConv) return

        const msg = newMessage
        setNewMessage('') // optimistic clear

        // Optimistic UI update
        setMessages(prev => [...prev, { id: 'temp', is_bot: false, sender_id: userId, message: msg, created_at: new Date().toISOString() }])

        await sendChatMessage(activeConv, msg)
        loadConversations() // reload to update 'status' if changed
    }


    if (!userId) return null // Hide if not logged in

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">

            {/* Chat Box */}
            {isOpen && (
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-80 sm:w-96 min-h-[450px] max-h-[600px] flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-5">

                    {/* Header */}
                    <div className="bg-primary p-4 text-white flex justify-between items-center">
                        <div>
                            <h3 className="font-bold">Apoio Clube da Sueca</h3>
                            <p className="text-xs text-primary-foreground/80">
                                {activeConv ? 'Em conversação' : 'Respostas rápidas (FAQ)'}
                            </p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-primary-foreground/80 hover:text-white transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-gray-50 flex flex-col overflow-hidden">

                        {!activeConv ? (
                            // Start new chat screen
                            <div className="p-6 flex-1 flex flex-col justify-center text-center">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageCircle className="w-8 h-8 text-primary" />
                                </div>
                                <h4 className="font-bold text-gray-900 mb-2">Como podemos ajudar?</h4>
                                <p className="text-sm text-gray-500 mb-6">O nosso assistente virtual pode responder rapidamente ou encaminhá-lo para um agente.</p>

                                <form onSubmit={handleStartNew} className="text-left">
                                    <textarea
                                        name="message"
                                        required
                                        placeholder="Descreva a sua dúvida..."
                                        rows={3}
                                        className="w-full rounded-xl border border-gray-300 p-3 text-sm focus:ring-2 focus:ring-ring focus:outline-none mb-3"
                                    />
                                    <button
                                        disabled={loading}
                                        className="w-full bg-primary text-white rounded-xl py-2.5 font-bold hover:bg-primary/90 transition-colors disabled:opacity-50"
                                    >
                                        {loading ? 'A iniciar...' : 'Iniciar Conversa'}
                                    </button>
                                </form>
                            </div>
                        ) : (
                            // Chat flow screen
                            <>
                                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                                    {messages.map((msg, i) => {
                                        const isMine = msg.sender_id === userId
                                        const isBot = msg.is_bot

                                        return (
                                            <div key={msg.id || i} className={`w-full flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${isMine ? 'bg-primary text-white rounded-br-sm'
                                                    : (isBot ? 'bg-indigo-50 border border-indigo-100 text-gray-800 rounded-bl-sm' : 'bg-gray-200 text-gray-800 rounded-bl-sm')
                                                    }`}>
                                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                                    <div className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/80' : 'text-gray-400'}`}>
                                                        {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Input Form */}
                                <div className="p-3 bg-white border-t border-gray-100 shrink-0">
                                    <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Escreva a sua mensagem..."
                                            className="w-full rounded-full border border-gray-300 bg-gray-50 pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                            disabled={loading}
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="absolute right-2 top-1.5 bottom-1.5 w-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                        >
                                            <Send className="h-4 w-4" />
                                        </button>
                                    </form>
                                    <div className="mt-2 text-center text-xs text-gray-400">
                                        Powered by Clube da Sueca
                                    </div>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            )}

            {/* Toggle Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-white shadow-xl hover:bg-primary/90 transition-transform hover:scale-105 active:scale-95"
            >
                {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
            </button>
        </div>
    )
}
