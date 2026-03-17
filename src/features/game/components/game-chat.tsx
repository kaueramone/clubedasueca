'use client'

import { memo, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { MessageCircle, X, Send } from 'lucide-react'

interface GameChatToggleProps {
    onClick: () => void
    unreadCount: number
}

export const GameChatToggle = memo(function GameChatToggle({ onClick, unreadCount }: GameChatToggleProps) {
    return (
        <button
            onClick={onClick}
            className="relative bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full sm:rounded-xl p-2 sm:p-3 border border-white/10 shadow-xl transition-colors text-white"
            aria-label={`Abrir chat${unreadCount > 0 ? `, ${unreadCount} mensagens não lidas` : ''}`}
        >
            <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full shadow-md animate-bounce" aria-hidden="true">
                    {unreadCount}
                </span>
            )}
        </button>
    )
})

interface GameChatProps {
    showChat: boolean
    setShowChat: (show: boolean) => void
    messages: { sender: string; text: string; time: string; isBot?: boolean }[]
    newMessage: string
    setNewMessage: (msg: string) => void
    onSendMessage: (e: React.FormEvent) => void
    currentUsername: string
}

export const GameChat = memo(function GameChat({
    showChat,
    setShowChat,
    messages,
    newMessage,
    setNewMessage,
    onSendMessage,
    currentUsername,
}: GameChatProps) {
    const chatEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (showChat) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, showChat])

    const renderMessages = (keyPrefix: string) => (
        messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm text-center px-4">
                <MessageCircle className="w-8 h-8 mb-2 opacity-20" />
                <p>O chat está vazio.</p>
                <p>Quebra o gelo!</p>
            </div>
        ) : (
            messages.map((msg, idx) => {
                const isMe = msg.sender === currentUsername
                return (
                    <div key={`${keyPrefix}-${idx}-${msg.sender}-${msg.time}`} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "mr-auto items-start")}>
                        <span className="text-[10px] text-gray-400 mb-0.5 px-1 font-bold">
                            {msg.sender} {msg.isBot && <span className="bg-blue-500/20 text-blue-400 text-[8px] px-1 rounded ml-1">BOT</span>}
                        </span>
                        <div className={cn(
                            "px-3 py-2 rounded-2xl text-sm shadow-sm",
                            isMe
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-white/10 text-white rounded-tl-sm border border-white/5"
                        )}>
                            {msg.text}
                        </div>
                        <span className="text-[9px] text-gray-500 mt-0.5 px-1">{msg.time}</span>
                    </div>
                )
            })
        )
    )

    const renderInput = () => (
        <form onSubmit={onSendMessage} className="p-3 border-t border-white/10 bg-black/40">
            <div className="relative flex items-center">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Escreve uma mensagem..."
                    className="w-full bg-white/10 border border-white/10 text-white text-sm rounded-full pl-4 pr-10 py-2.5 outline-none focus:ring-1 focus:ring-accent focus:border-accent transition-all placeholder:text-gray-500"
                    aria-label="Mensagem de chat"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="absolute right-1 w-8 h-8 flex items-center justify-center bg-accent text-accent-foreground rounded-full hover:bg-accent/90 disabled:opacity-50 disabled:hover:bg-accent transition-colors"
                    aria-label="Enviar mensagem"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </form>
    )

    return (
        <>
            {/* Mobile: Fullscreen slide-from-right overlay */}
            <div
                className={cn(
                    "fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-xl transition-transform duration-300 ease-in-out md:hidden",
                    showChat ? "translate-x-0" : "translate-x-full"
                )}
                role="log"
                aria-label="Chat da mesa"
            >
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-accent" />
                        Chat da Mesa
                    </h3>
                    <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10" aria-label="Fechar chat">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
                    {renderMessages('m')}
                    <div ref={chatEndRef} />
                </div>

                {renderInput()}
            </div>

            {/* Desktop: Side panel sliding from right */}
            <div
                className={cn(
                    "absolute top-0 right-0 z-[100] hidden md:flex flex-col w-[320px] h-full bg-black/80 backdrop-blur-xl border-l border-white/10 shadow-2xl transition-transform duration-300 ease-in-out",
                    showChat ? "translate-x-0" : "translate-x-full"
                )}
                role="log"
                aria-label="Chat da mesa"
            >
                <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-accent" />
                        Chat da Mesa
                    </h3>
                    <button onClick={() => setShowChat(false)} className="text-gray-400 hover:text-white transition-colors p-1 rounded-full hover:bg-white/10" aria-label="Fechar chat">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin scrollbar-thumb-white/20">
                    {renderMessages('d')}
                    <div ref={chatEndRef} />
                </div>

                {renderInput()}
            </div>
        </>
    )
})
