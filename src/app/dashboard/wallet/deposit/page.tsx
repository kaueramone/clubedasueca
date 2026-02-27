'use client'

import { useState } from 'react'
import { deposit } from '../actions' // we need to check relative path
import { ArrowLeft, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function DepositPage() {
    const [amount, setAmount] = useState<string>('')
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleGenerateRef = (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || parseFloat(amount) <= 0) return
        setStep(2)
    }

    const handleConfirmPayment = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.append('amount', amount)

        // Call server action
        const res = await deposit(formData)

        if (res?.error) {
            alert(res.error)
            setLoading(false)
        } else {
            // Success
            setTimeout(() => {
                setLoading(false)
                setStep(3)
                router.refresh() // Update server components (wallet balance)
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
            }, 1000) // Simulate network delay
        }
    }

    return (
        <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="mb-6 flex items-center gap-2">
                <Link href="/dashboard" className="text-gray-400 hover:text-gray-600">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold text-gray-900">Depositar Saldo</h1>
            </div>

            {step === 1 && (
                <form onSubmit={handleGenerateRef} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Valor a depositar (€)</label>
                        <div className="relative mt-1">
                            <span className="absolute left-3 top-3 text-gray-400">€</span>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="block w-full rounded-xl border border-gray-300 bg-gray-50 pl-8 p-3 text-lg font-semibold focus:border-accent focus:outline-none focus:ring-accent"
                                placeholder="10.00"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Valor mínimo: 1.00€</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-accent py-3 font-semibold text-white shadow-md active:scale-[0.98] transition-transform"
                    >
                        Gerar Referência MB Way
                    </button>
                </form>
            )}

            {step === 2 && (
                <div className="space-y-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Smartphone className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Confirmação MB Way</h3>
                        <p className="text-sm text-gray-500">Aceite a notificação no seu telemóvel</p>
                    </div>

                    <div className="rounded-xl bg-gray-50 p-4 text-left space-y-2">
                        <div className="flex justify-between">
                            <span className="text-gray-500">Entidade</span>
                            <span className="font-mono font-bold">12345</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-500">Referência</span>
                            <span className="font-mono font-bold">123 456 789</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-200 pt-2">
                            <span className="text-gray-500">Valor</span>
                            <span className="font-bold text-accent">€{parseFloat(amount).toFixed(2)}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirmPayment}
                        disabled={loading}
                        className="w-full rounded-xl bg-ios-green py-3 font-semibold text-white shadow-md active:scale-[0.98] transition-transform disabled:opacity-50"
                    >
                        {loading ? 'A processar...' : 'Simular Pagamento no App Bancário'}
                    </button>

                    <button
                        onClick={() => setStep(1)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="text-center py-8">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600 mb-4 animate-bounce">
                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Depósito Confirmado!</h3>
                    <p className="text-gray-500 mt-2">O saldo foi adicionado à sua carteira.</p>
                    <p className="text-xs text-gray-400 mt-4">Redirecionando...</p>
                </div>
            )}
        </div>
    )
}
