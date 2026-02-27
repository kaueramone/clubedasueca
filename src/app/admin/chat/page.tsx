'use client'

import { useEffect, useState, useRef } from 'react'
import { adminGetConversations, adminAssignConversation, getChatMessages, sendChatMessage, adminResolveConversation } from '@/features/chat/actions'
import { MessageSquare, Clock, User, CheckCircle, Send } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function AdminChatPage() {
    const [conversations, setConversations] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all') // all, open, waiting_agent, active, resolved

    const [activeConv, setActiveConv] = useState<any | null>(null)
    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')

    const messagesEndRef = useRef<HTMLDivElement>(null)
    const supabase = createClient()

    useEffect(() => { loadConversations() }, [filter])

    // Real-time for selected conversation
    useEffect(() => {
        if (!activeConv) return

        const channel = supabase.channel(`admin_chat_${activeConv.id}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'live_messages', filter: `conversation_id=eq.${activeConv.id}` },
                (payload) => {
                    setMessages(prev => [...prev, payload.new])
                }
            )
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [activeConv])

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    async function loadConversations() {
        setLoading(true)
        const res = await adminGetConversations(filter)
        if (res.conversations) setConversations(res.conversations)
        setLoading(false)
    }

    async function openConversation(conv: any) {
        setActiveConv(conv)
        const res = await getChatMessages(conv.id)
        if (res.messages) setMessages(res.messages)
    }

    async function handleAssign() {
        if (!activeConv) return
        await adminAssignConversation(activeConv.id)
        loadConversations()
        setActiveConv({ ...activeConv, status: 'active' })
    }

    async function handleResolve() {
        if (!activeConv) return
        await adminResolveConversation(activeConv.id)
        loadConversations()
        setActiveConv({ ...activeConv, status: 'resolved' })
    }

    async function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        if (!newMessage.trim() || !activeConv) return

        const msg = newMessage
        setNewMessage('')

        // Optimistic
        setMessages(prev => [...prev, { id: 'temp', is_bot: false, sender_id: 'admin', message: msg, created_at: new Date().toISOString() }])
        await sendChatMessage(activeConv.id, msg)
        loadConversations() // update list timestamps
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row h-screen">

            {/* Sidebar (Conversations List) */}
            <div className="w-full md:w-96 bg-white border-r border-gray-200 flex flex-col h-full shrink-0">
                <div className="p-4 border-b border-gray-200">
                    <Link href="/admin" className="text-sm text-accent hover:underline mb-2 inline-block">← Admin Hub</Link>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" /> Support Desk
                    </h1>

                    <select
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        className="mt-4 w-full rounded-xl border border-gray-300 p-2 text-sm"
                    >
                        <option value="all">Todas as conversas</option>
                        <option value="waiting_agent">A aguardar Agente ⚠️</option>
                        <option value="active">Em Atendimento</option>
                        <option value="open">Bot FAQ / Novas</option>
                        <option value="resolved">Resolvidas</option>
                    </select>
                </div>

                <div className="flex-1 overflow-y-auto w-full">
                    {loading ? (
                        <div className="p-8 text-center text-sm text-gray-500">A carregar...</div>
                    ) : conversations.length === 0 ? (
                        <div className="p-8 text-center text-sm text-gray-500">Nenhuma conversa encontrada.</div>
                    ) : (
                        <div className="divide-y">
                            {conversations.map(conv => (
                                <button
                                    key={conv.id}
                                    onClick={() => openConversation(conv)}
                                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex flex-col select-none ${activeConv?.id === conv.id ? 'bg-muted border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
                                >
                                    <div className="flex justify-between items-start w-full mb-1">
                                        <span className="font-bold text-sm text-gray-900 truncate">{(conv.user as any)?.username || (conv.user as any)?.email}</span>
                                        <span className="text-xs text-gray-500 shrink-0">
                                            {new Date(conv.updated_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600 mb-2 truncate">Assunto: {conv.subject}</div>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${conv.status === 'waiting_agent' ? 'bg-red-100 text-red-700' :
                                                conv.status === 'active' ? 'bg-green-100 text-green-700' :
                                                    conv.status === 'resolved' ? 'bg-gray-100 text-gray-600' :
                                                        'bg-yellow-100 text-yellow-800'
                                            }`}>{conv.status.replace('_', ' ')}</span>
                                        {conv.agent && <span className="text-[10px] text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">{(conv.agent as any).username}</span>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-white relative">
                {activeConv ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 border-b border-gray-200 bg-white flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="font-bold text-lg text-gray-900">{(activeConv.user as any)?.username}</h2>
                                <p className="text-xs text-gray-500">{(activeConv.user as any)?.email}</p>
                            </div>

                            <div className="flex gap-2">
                                {activeConv.status === 'waiting_agent' && (
                                    <button onClick={handleAssign} className="bg-primary hover:bg-primary/90 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
                                        Atender Utilizador
                                    </button>
                                )}
                                {(activeConv.status === 'active' || activeConv.status === 'open' || activeConv.status === 'waiting_agent') && (
                                    <button onClick={handleResolve} className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                        <CheckCircle className="w-4 h-4" /> Resolver
                                    </button>
                                )}
                                {activeConv.status === 'resolved' && (
                                    <span className="text-sm font-semibold text-gray-500 flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-lg">
                                        <CheckCircle className="w-4 h-4" /> Resolvido
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 flex flex-col gap-4">
                            {messages.map((msg, i) => {
                                const isAdmin = !msg.is_bot && msg.sender_id !== activeConv.user_id
                                const isUser = !msg.is_bot && msg.sender_id === activeConv.user_id
                                const isBot = msg.is_bot

                                return (
                                    <div key={msg.id || i} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm shadow-sm ${isAdmin ? 'bg-primary text-white rounded-br-sm' :
                                                isBot ? 'bg-white border border-yellow-200 text-gray-800 rounded-bl-sm relative' :
                                                    'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                                            }`}>
                                            {isBot && <div className="text-[10px] font-bold text-yellow-600 mb-1 uppercase tracking-wider">Bot Automatizado</div>}
                                            <p className="whitespace-pre-wrap leading-relaxed">{msg.message}</p>
                                            <div className={`text-[10px] mt-2 text-right ${isAdmin ? 'text-primary-foreground/80' : 'text-gray-400'}`}>
                                                {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Area */}
                        {(activeConv.status !== 'resolved') && (
                            <div className="p-4 bg-white border-t border-gray-200 shrink-0">
                                {activeConv.status === 'active' ? (
                                    <form onSubmit={handleSendMessage} className="flex gap-3">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={e => setNewMessage(e.target.value)}
                                            placeholder="Escreva a resposta para o utilizador..."
                                            className="flex-1 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                        />
                                        <button
                                            type="submit"
                                            disabled={!newMessage.trim()}
                                            className="px-6 rounded-xl bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors"
                                        >
                                            Enviar <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                ) : (
                                    <div className="text-center p-4 bg-yellow-50 text-yellow-800 rounded-xl text-sm border border-yellow-200">
                                        Apenas pode enviar mensagens após "Atender Utilizador" e assinalar esta conversa à sua conta de administrador.
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <MessageSquare className="w-16 h-16 mb-4 text-gray-200" />
                        <p className="text-lg font-medium">Selecione uma conversa para iniciar o atendimento</p>
                    </div>
                )}
            </div>
        </div>
    )
}
