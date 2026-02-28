'use client'

import { useState } from 'react'
import { requestWithdrawal } from '../actions'
import { ArrowLeft, Landmark } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function WithdrawPage() {
    const [amount, setAmount] = useState<string>('')
    const [pixKey, setPixKey] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        const formData = new FormData()
        formData.append('amount', amount)
        formData.append('pixKey', pixKey) // Using this field for IBAN/Phone

        // Call server action
        const res = await requestWithdrawal(formData)

        if (res?.error) {
            alert(res.error)
            setLoading(false)
        } else {
            alert("Pedido de levantamento enviado com sucesso! Aguarde aprovaÃ§Ã£o.")
            router.push('/dashboard')
        }
    }

    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 flex items-center gap-2">
                <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900">Solicitar Saque</h1>
            </div>

            <div className="mb-6 rounded-xl bg-yellow-50 p-4 text-sm text-yellow-800 border border-yellow-100">
                <p>âš ï¸ O levantamento pode demorar atÃ© 24 horas para aprovaÃ§Ã£o.</p>
                <p className="mt-1">Taxa fixa de saque: <strong>1.00â‚¬</strong></p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Valor a levantar (â‚¬)</label>
                    <div className="relative mt-1">
                        <span className="absolute left-3 top-3 text-gray-400">â‚¬</span>
                        <input
                            type="number"
                            min="10"
                            step="0.01"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full rounded-xl border border-gray-300 bg-gray-50 pl-8 p-3 text-lg font-semibold focus:border-accent focus:outline-none focus:ring-accent"
                            placeholder="0.00"
                        />
                    </div>
                    <p className="mt-2 text-xs text-gray-500">MÃ­nimo: 10.00â‚¬ (+1â‚¬ taxa)</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">IBAN ou TelemÃ³vel (MB Way)</label>
                    <input
                        type="text"
                        required
                        value={pixKey}
                        onChange={(e) => setPixKey(e.target.value)}
                        className="mt-1 block w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-900 font-bold focus:border-accent focus:outline-none focus:ring-accent"
                        placeholder="PT50..."
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-accent py-3 font-semibold text-white shadow-md active:scale-[0.98] transition-transform disabled:opacity-70"
                >
                    {loading ? 'A processar...' : 'Confirmar Saque'}
                </button>
            </form>
        </div>
    )
}
