'use client'

import { useState } from 'react'
import { Send, MessageSquare } from 'lucide-react'

export default function SupportPage() {
    const [sent, setSent] = useState(false)

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setSent(true)
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="p-1 text-accent">
                    <MessageSquare className="h-10 w-10" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white">Suporte</h1>
                    <p className="text-white/70">Precisa de ajuda? Abra um ticket.</p>
                </div>
            </div>

            {sent ? (
                <div className="p-8 text-center space-y-4 border border-green-100 bg-green-50/50 rounded-xl">
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-4">
                        <Send className="h-8 w-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-800">Mensagem Enviada!</h2>
                    <p className="text-green-700">A nossa equipa irá responder para o seu email em breve.</p>
                    <button
                        onClick={() => setSent(false)}
                        className="mt-4 px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50 transition"
                    >
                        Enviar nova mensagem
                    </button>
                </div>
            ) : (
                <div className="p-6 bg-white shadow-sm border border-gray-100 rounded-xl">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Assunto</label>
                            <input
                                required
                                type="text"
                                placeholder="Ex: Problema com depósito"
                                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Mensagem</label>
                            <textarea
                                required
                                placeholder="Descreva o seu problema detalhadamente..."
                                className="w-full min-h-[120px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            type="submit"
                            className="w-full flex items-center justify-center bg-accent/90 hover:bg-blue-700 text-white font-bold py-3px-6 rounded-lg text-lg h-12 transition shadow-md"
                        >
                            <Send className="mr-2 h-5 w-5" />
                            Abrir Ticket
                        </button>
                    </form>
                </div>
            )}

            <div className="text-center text-sm text-gray-400 mt-8">
                <p>Tempo médio de resposta: 24 horas</p>
            </div>
        </div>
    )
}
