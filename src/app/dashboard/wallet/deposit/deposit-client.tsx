'use client'

import { useState } from 'react'
import { deposit } from '../actions'
import { ArrowLeft, Smartphone, Check } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Carteiras móveis de Moçambique (FICTÍCIO — sem gateway real ligado).
// 1 crédito = 1 MZN (1:1). Depósito mínimo: 50 MZN.
const METHODS = [
    { id: 'mpesa', name: 'M-Pesa', operator: 'Vodacom', color: 'text-red-600', prefix: '84 / 85' },
    { id: 'emola', name: 'e-Mola', operator: 'Movitel', color: 'text-yellow-600', prefix: '86 / 87' },
    { id: 'mkesh', name: 'mKesh', operator: 'Tmcel', color: 'text-blue-600', prefix: '82 / 83' },
]

const PRESET_AMOUNTS = [50, 100, 250, 500] // MZN
const MIN_DEPOSIT = 50

export function DepositPageClient() {
    const [method, setMethod] = useState(METHODS[0])
    const [amount, setAmount] = useState<string>('100')
    const [phone, setPhone] = useState('')
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleGenerateRef = (e: React.FormEvent) => {
        e.preventDefault()
        if (!amount || parseFloat(amount) < MIN_DEPOSIT) {
            alert(`O valor mínimo de depósito é ${MIN_DEPOSIT} MZN.`)
            return
        }
        if (!phone.trim()) {
            alert('Indique o número da sua carteira móvel.')
            return
        }
        setStep(2)
    }

    const handleConfirmPayment = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.append('amount', amount) // MZN = créditos (1:1)

        const res = await deposit(formData)

        if (res?.error) {
            alert(res.error)
            setLoading(false)
        } else {
            setTimeout(() => {
                setLoading(false)
                setStep(3)
                router.refresh()
                setTimeout(() => {
                    router.push('/dashboard')
                }, 2000)
            }, 1000)
        }
    }

    return (
        <div className="max-w-md mx-auto bg-white dark:bg-card rounded-2xl shadow-sm border border-border p-6 mb-20 animate-in fade-in">
            <div className="mb-6 flex items-center gap-2">
                <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <h1 className="text-xl font-bold text-foreground">Depositar Saldo</h1>
            </div>

            {step === 1 && (
                <form onSubmit={handleGenerateRef} className="space-y-6">
                    {/* Method Selector */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-3">Escolha a carteira móvel</label>
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
                        <label className="block text-sm font-semibold text-foreground mb-3">Valor a depositar (MZN)</label>
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
                                min={MIN_DEPOSIT}
                                step="1"
                                required
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="block w-full rounded-xl border border-border bg-background pl-[60px] p-3 text-lg font-bold focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
                                placeholder="100"
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                            Mínimo {MIN_DEPOSIT} MZN. 100 MZN = 100 créditos (1:1) para jogar nas mesas.
                        </p>
                    </div>

                    {/* Phone Input */}
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Número {method.name} ({method.operator})</label>
                        <input
                            type="tel"
                            inputMode="numeric"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder={`Ex: ${method.id === 'mpesa' ? '84xxxxxxx' : method.id === 'emola' ? '86xxxxxxx' : '82xxxxxxx'}`}
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-accent py-4 font-bold text-white shadow-md active:scale-[0.98] hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        <Smartphone className="w-5 h-5" />
                        Avançar ({method.name})
                    </button>
                </form>
            )}

            {step === 2 && (
                <div className="space-y-6 text-center animate-in slide-in-from-right-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                        <Smartphone className="h-8 w-8" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Aguardando Pagamento</h3>
                        <p className="text-sm text-muted-foreground">
                            Confirme o PIN no seu telemóvel ({method.name}) para autorizar o pagamento.
                        </p>
                    </div>

                    <div className="rounded-xl bg-muted/50 p-4 text-left space-y-3">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Carteira</span>
                            <span className={`font-bold ${method.color}`}>{method.name}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground text-sm">Número</span>
                            <span className="font-mono font-bold text-foreground">{phone}</span>
                        </div>
                        <div className="flex justify-between border-t border-border pt-3 mt-2">
                            <span className="text-muted-foreground font-semibold">Total a pagar</span>
                            <div className="text-right">
                                <p className="font-bold text-lg text-accent">{parseFloat(amount || '0').toFixed(0)} MZN</p>
                                <p className="text-xs text-muted-foreground">Serão creditados {parseFloat(amount || '0').toFixed(0)} créditos</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={handleConfirmPayment}
                        disabled={loading}
                        className="w-full rounded-xl bg-green-500 hover:bg-green-600 py-4 font-bold text-white shadow-md active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? 'A processar...' : 'Simular Confirmação de Transação'}
                    </button>

                    <button
                        onClick={() => setStep(1)}
                        className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Cancelar
                    </button>
                </div>
            )}

            {step === 3 && (
                <div className="text-center py-10 animate-in zoom-in-95 duration-300">
                    <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-green-500/20 text-green-500 mb-6 border-4 border-green-500/30">
                        <Check className="w-12 h-12" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground mb-2">Depósito Confirmado!</h3>
                    <p className="text-muted-foreground">{parseFloat(amount || '0').toFixed(0)} créditos estão na sua carteira.</p>
                    <p className="text-sm text-muted-foreground mt-8 animate-pulse text-accent">A redirecionar para o painel...</p>
                </div>
            )}
        </div>
    )
}
