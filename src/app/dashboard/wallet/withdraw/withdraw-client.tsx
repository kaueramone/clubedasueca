'use client'

import { useState } from 'react'
import { requestWithdrawal } from '../actions'
import { ArrowLeft, Landmark, Loader2, Smartphone } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Saque para carteira móvel de Moçambique (FICTÍCIO — sem gateway real ligado).
// 1 crédito = 1 MZN (1:1). Saque mínimo: 250 MZN.
const METHODS = [
    { id: 'mpesa', name: 'M-Pesa', operator: 'Vodacom', color: 'text-red-600', placeholder: 'Ex: 84xxxxxxx' },
    { id: 'emola', name: 'e-Mola', operator: 'Movitel', color: 'text-yellow-600', placeholder: 'Ex: 86xxxxxxx' },
    { id: 'mkesh', name: 'mKesh', operator: 'Tmcel', color: 'text-blue-600', placeholder: 'Ex: 82xxxxxxx' },
]

const PRESET_AMOUNTS = [250, 500, 1000, 2000] // MZN
const MIN_WITHDRAW = 250

export function WithdrawPageClient() {
    const [method, setMethod] = useState(METHODS[0])
    const [amount, setAmount] = useState<string>('250')
    const [phone, setPhone] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || parseFloat(amount) < MIN_WITHDRAW) {
            alert(`O montante mínimo de levantamento é ${MIN_WITHDRAW} MZN.`)
            return
        }
        if (!phone.trim()) {
            alert('Por favor indique o número da carteira móvel de destino.')
            return
        }

        setLoading(true)

        const formData = new FormData()
        formData.append('amount', amount)
        // Guarda o destino para facilitar a aprovação manual no admin.
        formData.append('pixKey', `${method.name} (${method.operator}): ${phone}`)

        const res = await requestWithdrawal(formData)

        if (res?.error) {
            alert(res.error)
            setLoading(false)
        } else {
            alert('Pedido de levantamento enviado com sucesso! Aguarde aprovação.')
            router.push('/dashboard')
        }
    }

    return (
        <div className="max-w-md mx-auto bg-white dark:bg-card rounded-2xl shadow-sm border border-border p-6 mb-20 animate-in fade-in">
            <div className="mb-6 flex items-center gap-2">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold text-foreground">Solicitar Saque (Levantamento)</h1>
            </div>

            <div className="mb-6 rounded-xl bg-yellow-50 dark:bg-yellow-900/10 p-4 text-sm text-yellow-800 dark:text-yellow-600 border border-yellow-200 dark:border-yellow-800/30 flex items-start gap-3">
                <Landmark className="w-5 h-5 shrink-0 mt-0.5" />
                <p>O levantamento pode demorar até 24 horas para aprovação pelo nosso Apoio ao Cliente.</p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">

                {/* Method Selector */}
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">Carteira móvel de destino</label>
                    <div className="grid grid-cols-3 gap-2">
                        {METHODS.map(m => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => setMethod(m)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${method.id === m.id ? 'border-accent bg-accent/5' : 'border-border bg-muted/30 hover:bg-muted'}`}
                            >
                                <Smartphone className={`h-6 w-6 mb-1 ${m.color}`} />
                                <span className={`text-[11px] font-bold ${method.id === m.id ? 'text-accent' : 'text-muted-foreground'}`}>{m.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount Selector */}
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">Valor a levantar (créditos · 1 = 1 MZN)</label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {PRESET_AMOUNTS.map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setAmount(val.toString())}
                                className={`py-2 rounded-lg text-sm font-bold transition-colors ${amount === val.toString() ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/20'}`}
                            >
                                {val}
                            </button>
                        ))}
                    </div>

                    <div className="relative mt-1">
                        <span className="absolute left-3 top-3.5 text-muted-foreground text-sm font-bold">MZN</span>
                        <input
                            type="number"
                            min={MIN_WITHDRAW}
                            step="1"
                            required
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="block w-full rounded-xl border border-border bg-background pl-[60px] p-3 text-lg font-bold focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
                            placeholder="250"
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Mínimo para saque: {MIN_WITHDRAW} MZN.</p>
                </div>

                {/* Destination Phone Input */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Número {method.name} ({method.operator})</label>
                    <input
                        type="tel"
                        inputMode="numeric"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder={method.placeholder}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-accent py-4 font-bold text-white shadow-md active:scale-[0.98] transition-transform disabled:opacity-70 flex items-center justify-center gap-2 mt-4"
                >
                    {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Smartphone className="w-5 h-5" />
                            Confirmar Pedido de Saque
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
