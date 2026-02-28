'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Send, Image as ImageIcon, UserPlus, Check, X, Menu, ArrowLeft, Loader2, MessageCircle } from 'lucide-react'
import { searchUsers, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, getDirectMessages, sendDirectMessage } from './actions'
import Image from 'next/image'

export default function ChatUI({ currentUser, contacts: initialContacts, pendingRequests: initialRequests }: any) {
    const [contacts, setContacts] = useState(initialContacts)
    const [pendingRequests, setPendingRequests] = useState(initialRequests)
    const [activeContact, setActiveContact] = useState<any>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [isSearching, setIsSearching] = useState(false)

    const [messages, setMessages] = useState<any[]>([])
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)

    const [isSidebarOpen, setIsSidebarOpen] = useState(true)

    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Fetch messages periodically
    useEffect(() => {
        if (!activeContact) return

        const fetchMessages = async () => {
            const data = await getDirectMessages(activeContact.id)
            setMessages(data || [])
        }

        setIsLoadingMessages(true)
        fetchMessages().then(() => setIsLoadingMessages(false))

        const interval = setInterval(fetchMessages, 3000)
        return () => clearInterval(interval)
    }, [activeContact])

    // Search effect
    useEffect(() => {
        const timeout = setTimeout(async () => {
            if (searchQuery.length >= 3) {
                setIsSearching(true)
                const res = await searchUsers(searchQuery)
                setSearchResults(res || [])
                setIsSearching(false)
            } else {
                setSearchResults([])
            }
        }, 500)
        return () => clearTimeout(timeout)
    }, [searchQuery])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMessage.trim() || !activeContact) return

        const text = newMessage
        setNewMessage('')
        setIsSending(true)

        // Optimistic UI
        const tempId = Date.now().toString()
        setMessages(prev => [...prev, { id: tempId, content: text, sender_id: currentUser.id, created_at: new Date().toISOString() }])

        const res = await sendDirectMessage(activeContact.id, text)
        if (res?.error) {
            alert(res.error)
            setMessages(prev => prev.filter(m => m.id !== tempId)) // Revert
        }

        setIsSending(false)
    }

    const handleImageUpload = () => {
        alert("Upload de imagem em breve. Serão gerados links no storage e passados no `imageUrl` parameters no action de Chat.");
    }

    const onAccept = async (reqId: string) => {
        const res = await acceptFriendRequest(reqId)
        if (res?.success) {
            window.location.reload() // Or update local state
        }
    }

    const onReject = async (reqId: string) => {
        const res = await rejectFriendRequest(reqId)
        if (res?.success) {
            setPendingRequests((prev: any[]) => prev.filter(p => p.friendship_id !== reqId))
        }
    }

    const onAddFriend = async (userId: string) => {
        const res = await sendFriendRequest(userId)
        if (res?.error) {
            alert(res.error)
        } else {
            alert("Pedido de amizade enviado!")
            setQueryAndClose('')
        }
    }

    const setQueryAndClose = (val: string) => {
        setSearchQuery(val)
    }

    const selectContact = (c: any) => {
        setActiveContact(c)
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false)
        }
    }

    return (
        <div className="flex h-full w-full bg-[#f8fafc] dark:bg-[#0f172a] relative">

            {/* Sidebar (Contacts & Search) */}
            <div className={`absolute lg:relative z-20 w-full lg:w-80 h-full bg-white dark:bg-card border-r border-border transition-transform duration-300 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>

                {/* Search Bar */}
                <div className="p-4 border-b border-border space-y-4 shrink-0 bg-primary/5">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-accent" />
                        Mensagens
                        {pendingRequests.length > 0 && (
                            <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center -ml-1 mt-[-10px] shadow-sm">
                                {pendingRequests.length}
                            </span>
                        )}
                    </h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Procurar amigos (mín. 3 letras)"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-secondary border border-transparent focus:border-accent rounded-full text-base font-medium text-gray-900 dark:text-gray-100 placeholder:text-gray-600 dark:placeholder:text-gray-400 outline-none transition-colors"
                        />
                    </div>
                </div>

                {/* Sidebar Body */}
                <div className="flex-1 overflow-y-auto">

                    {/* Search Results */}
                    {searchQuery.length > 0 && (
                        <div className="p-2 border-b border-border bg-yellow-50 dark:bg-yellow-900/10">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Resultados da Procura</h3>
                            {isSearching ? (
                                <div className="p-4 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
                            ) : searchResults.length > 0 ? (
                                <ul className="space-y-1">
                                    {searchResults.map(u => (
                                        <li key={u.id} className="flex items-center justify-between p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg">
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                    {u.avatar_url && <Image src={u.avatar_url} alt="A" width={32} height={32} className="object-cover w-full h-full" />}
                                                </div>
                                                <span className="text-sm font-medium truncate">{u.username}</span>
                                            </div>
                                            <button onClick={() => onAddFriend(u.id)} className="p-1.5 bg-accent/10 hover:bg-accent text-accent hover:text-white rounded-full transition-colors" title="Adicionar">
                                                <UserPlus className="w-4 h-4" />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="p-4 text-sm text-center text-muted-foreground">Nenhum utilizador encontrado.</p>
                            )}
                        </div>
                    )}

                    {/* Pending Requests */}
                    {!searchQuery && pendingRequests.length > 0 && (
                        <div className="p-2 border-b border-border bg-accent/5">
                            <h3 className="text-xs font-semibold text-accent uppercase tracking-wider mb-2 px-2">Pedidos Pendentes</h3>
                            <ul className="space-y-1">
                                {pendingRequests.map((p: any) => (
                                    <li key={p.friendship_id} className="flex flex-col gap-2 p-3 bg-white dark:bg-secondary rounded-xl shadow-sm border border-border">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                                {p.avatar_url && <Image src={p.avatar_url} alt="A" width={40} height={40} className="object-cover w-full h-full" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold truncate">{p.username}</p>
                                                <p className="text-xs text-muted-foreground truncate">Quer ser teu amigo</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => onAccept(p.friendship_id)} className="flex-1 flex items-center justify-center py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-bold transition-colors"><Check className="w-3 h-3 mr-1" /> Aceitar</button>
                                            <button onClick={() => onReject(p.friendship_id)} className="flex-1 flex items-center justify-center py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors"><X className="w-3 h-3 mr-1" /> Recusar</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Contact List */}
                    {!searchQuery && (
                        <div className="p-2">
                            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2 mt-2">Mensagens Diretas</h3>
                            <ul className="space-y-1">
                                {contacts.map((c: any) => (
                                    <li
                                        key={c.id}
                                        onClick={() => selectContact(c)}
                                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${activeContact?.id === c.id ? 'bg-primary/10 text-primary dark:text-white ring-1 ring-primary/20' : 'hover:bg-gray-100 dark:hover:bg-secondary'}`}
                                    >
                                        <div className="relative">
                                            <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 ${c.isSupport ? 'bg-accent p-1' : 'bg-gray-200'}`}>
                                                {c.avatar_url && <Image src={c.avatar_url} alt="A" width={48} height={48} className="object-contain w-full h-full rounded-full" />}
                                            </div>
                                            {c.isSupport && (
                                                <div className="absolute -bottom-1 -right-1 bg-white dark:bg-card rounded-full p-0.5 shadow-sm">
                                                    <div className="bg-green-500 w-3 h-3 rounded-full border-2 border-white dark:border-card"></div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h4 className={`text-sm font-bold truncate ${c.isSupport ? 'text-accent' : ''}`}>{c.username}</h4>
                                            <p className="text-xs text-muted-foreground truncate">{c.isSupport ? 'Apoio ao Cliente Oficial' : 'Tocar para conversar'}</p>
                                        </div>
                                    </li>
                                ))}
                                {contacts.length === 1 && (
                                    <p className="px-4 mt-6 text-sm text-muted-foreground text-center">Nenhum amigo adicionado.<br />Tente pesquisar!</p>
                                )}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col w-full h-full bg-[#f8fafc] dark:bg-[#0f172a] relative z-10">

                {/* Mobile Header trigger */}
                <div className="lg:hidden p-4 bg-white dark:bg-card border-b border-border flex items-center gap-4 shrink-0 shadow-sm">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-100 dark:hover:bg-secondary rounded-full transition-colors">
                        {isSidebarOpen ? <ArrowLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                    {activeContact ? (
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                                {activeContact.avatar_url && <Image src={activeContact.avatar_url} alt="A" width={40} height={40} className="object-cover w-full h-full" />}
                            </div>
                            <span className="font-bold">{activeContact.username}</span>
                        </div>
                    ) : (
                        <span className="font-bold text-gray-900 dark:text-white">Selecione um chat</span>
                    )}
                </div>

                {activeContact ? (
                    <>
                        {/* Chat Desktop Header */}
                        <div className="hidden lg:flex p-4 bg-white dark:bg-card border-b border-border items-center gap-4 shrink-0 shadow-sm">
                            <div className={`w-12 h-12 rounded-full overflow-hidden shrink-0 ${activeContact.isSupport ? 'bg-accent/20 p-1' : 'bg-gray-200'}`}>
                                {activeContact.avatar_url && <Image src={activeContact.avatar_url} alt="A" width={48} height={48} className="object-contain w-full h-full rounded-full" />}
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${activeContact.isSupport ? 'text-accent' : ''}`}>{activeContact.username}</h3>
                                {activeContact.isSupport && <span className="text-xs font-semibold text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-sm">Oficial</span>}
                            </div>
                        </div>

                        {/* Messages Body */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {isLoadingMessages && messages.length === 0 ? (
                                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                            ) : (
                                messages.map((m: any, idx: number) => {
                                    const isMe = m.sender_id === currentUser.id
                                    return (
                                        <div key={m.id || idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm shadow-sm ${isMe
                                                ? 'bg-primary text-white rounded-br-none'
                                                : activeContact.isSupport
                                                    ? 'bg-accent/10 border border-accent/20 text-gray-900 dark:text-white rounded-bl-none'
                                                    : 'bg-white dark:bg-secondary border border-border text-gray-900 dark:text-white rounded-bl-none'
                                                }`}>
                                                {m.content}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="p-4 bg-white dark:bg-card border-t border-border shrink-0">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-2 max-w-4xl mx-auto">

                                {activeContact.isSupport && (
                                    <button type="button" onClick={handleImageUpload} className="p-3 text-muted-foreground hover:bg-gray-100 dark:hover:bg-secondary rounded-xl transition-colors shrink-0">
                                        <ImageIcon className="w-5 h-5" />
                                    </button>
                                )}

                                <input
                                    type="text"
                                    placeholder={activeContact.isSupport ? "Escreva a sua dúvida para o suporte..." : "Escreva a sua mensagem..."}
                                    value={newMessage}
                                    onChange={e => setNewMessage(e.target.value)}
                                    className="flex-1 bg-gray-100 dark:bg-secondary border border-transparent focus:border-accent rounded-xl px-4 py-3 outline-none text-base font-semibold text-gray-900 dark:text-gray-100 placeholder:text-gray-600 dark:placeholder:text-gray-400 transition-colors"
                                />

                                <button type="submit" disabled={isSending || !newMessage.trim()} className="p-3 bg-accent hover:bg-accent/90 text-white rounded-xl disabled:opacity-50 transition-colors shrink-0 shadow-sm">
                                    <Send className="w-5 h-5" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="hidden lg:flex flex-col items-center justify-center h-full text-center p-8">
                        <div className="w-24 h-24 bg-accent/10 rounded-full flex items-center justify-center mb-6">
                            <MessageCircle className="w-12 h-12 text-accent opacity-50" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">As suas conversas</h2>
                        <p className="text-muted-foreground max-w-sm">Partilhe risos, convide amigos para mesas e tire dúvidas diretamente com o nosso Suporte nativo.</p>
                    </div>
                )}

            </div>

        </div>
    )
}
