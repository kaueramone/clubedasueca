'use client'

import { useState } from 'react'
import { requestWithdrawal } from '../actions'
import { ArrowLeft, Landmark, Send, Loader2, Smartphone, Banknote, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const REGIONS = [
    { id: 'PT', name: 'Portugal', currency: 'EUR', symbol: '€', rate: 1, icon: '🇵🇹', method: 'MB Way / IBAN', placeholder: 'Ex: 910000000 ou PT50...' },
    { id: 'BR', name: 'Brasil', currency: 'BRL', symbol: 'R$', rate: 6.10, icon: '🇧🇷', method: 'PIX', placeholder: 'Ex: CPF, Email ou Chave Aleatória' },
    { id: 'MZ', name: 'Moçambique', currency: 'MZN', symbol: 'MT', rate: 68.5, icon: '🇲🇿', method: 'M-Pesa', placeholder: 'Ex: 840000000' }
]

const PRESET_AMOUNTS = [10, 20, 50, 100] // Base amounts in EUR

export function WithdrawPageClient() {
    const [region, setRegion] = useState(REGIONS[0])
    const [amountEur, setAmountEur] = useState<string>('10')
    const [paymentKey, setPaymentKey] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const localAmount = amountEur ? Math.ceil(parseFloat(amountEur) * region.rate).toString() : '0'

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!amountEur || parseFloat(amountEur) < 10) {
            alert("O montante mínimo de levantamento é 10€.")
            return
        }
        if (!paymentKey.trim()) {
            alert("Por favor preencha a sua Chave de Pagamento/Destino.")
            return
        }

        setLoading(true)

        const formData = new FormData()
        formData.append('amount', amountEur)
        // Store the details appending the region for admin ease
        formData.append('pixKey', `[${region.name}] ${region.method}: ${paymentKey}`)

        const res = await requestWithdrawal(formData)

        if (res?.error) {
            alert(res.error)
            setLoading(false)
        } else {
            alert("Pedido de levantamento enviado com sucesso! Aguarde aprovação.")
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
                <p>O levantamento pode demorar até 24 horas para aprovação via o nosso Apoio ao Cliente Misto.</p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-6">

                {/* Region Selector */}
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">Escolha o País de Destino</label>
                    <div className="grid grid-cols-3 gap-2">
                        {REGIONS.map(r => (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => setRegion(r)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all ${region.id === r.id ? 'border-accent bg-accent/5' : 'border-border bg-muted/30 hover:bg-muted'}`}
                            >
                                <span className="text-2xl mb-1">{r.icon}</span>
                                <span className={`text-[10px] font-bold ${region.id === r.id ? 'text-accent' : 'text-muted-foreground'}`}>{r.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Amount Selector */}
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-3">Valor a levantar da Carteira (€)</label>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        {PRESET_AMOUNTS.map(val => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => setAmountEur(val.toString())}
                                className={`py-2 rounded-lg text-sm font-bold transition-colors ${amountEur === val.toString() ? 'bg-primary text-white' : 'bg-muted text-muted-foreground hover:bg-primary/20'}`}
                            >
                                {val}€
                            </button>
                        ))}
                    </div>

                    <div className="relative mt-1">
                        <span className="absolute left-3 top-3.5 text-muted-foreground text-sm font-bold">EUR €</span>
                        <input
                            type="number"
                            min="10"
                            step="0.01"
                            required
                            value={amountEur}
                            onChange={(e) => setAmountEur(e.target.value)}
                            className="block w-full rounded-xl border border-border bg-background pl-[60px] p-3 text-lg font-bold focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
                            placeholder="10.00"
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">Mínimo para saque: €10.00 EUR</p>
                </div>

                {/* Conversion Display */}
                {region.id !== 'PT' && parseFloat(amountEur) > 0 && (
                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl space-y-2 border border-green-200 dark:border-green-800/30">
                        <p className="text-xs text-green-800 dark:text-green-600 font-semibold uppercase tracking-wider">Cotação Projetada na Sua Conta</p>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Recebe em {region.name} ({region.currency})</span>
                            <span className="text-lg font-bold text-green-700 dark:text-green-400">{region.symbol} {localAmount}</span>
                        </div>
                    </div>
                )}

                {/* Destination Key Input */}
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Chave {region.method}</label>
                    <input
                        type="text"
                        required
                        value={paymentKey}
                        onChange={(e) => setPaymentKey(e.target.value)}
                        className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder={region.placeholder}
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
                            {region.id === 'PT' && <Smartphone className="w-5 h-5" />}
                            {region.id === 'BR' && <Banknote className="w-5 h-5" />}
                            {region.id === 'MZ' && <CreditCard className="w-5 h-5" />}
                            Confirmar Pedido de Saque
                        </>
                    )}
                </button>
            </form>
        </div>
    )
}
