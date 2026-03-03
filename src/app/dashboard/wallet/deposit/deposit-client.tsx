'use client'

import { useState } from 'react'
import { deposit } from '../actions'
import { ArrowLeft, Smartphone, Check, CreditCard, Banknote } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const REGIONS = [
    { id: 'PT', name: 'Portugal', currency: 'EUR', symbol: '€', rate: 1, icon: '🇵🇹', method: 'MB Way' },
    { id: 'BR', name: 'Brasil', currency: 'BRL', symbol: 'R$', rate: 6.10, icon: '🇧🇷', method: 'PIX' }, // Fake rate for demo
    { id: 'MZ', name: 'Moçambique', currency: 'MZN', symbol: 'MT', rate: 68.5, icon: '🇲🇿', method: 'M-Pesa' } // Fake rate for demo
]

const PRESET_AMOUNTS = [10, 20, 50, 100] // Base amounts in EUR

export function DepositPageClient() {
    const [region, setRegion] = useState(REGIONS[0])
    const [amountEur, setAmountEur] = useState<string>('10')
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const localAmount = amountEur ? Math.ceil(parseFloat(amountEur) * region.rate).toString() : '0'

    const handleGenerateRef = (e: React.FormEvent) => {
        e.preventDefault()
        if (!amountEur || parseFloat(amountEur) <= 0) return
        setStep(2)
    }

    const handleConfirmPayment = async () => {
        setLoading(true)
        const formData = new FormData()
        formData.append('amount', amountEur) // Always send EUR to backend

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
                    {/* Region Selector */}
                    <div>
                        <label className="block text-sm font-semibold text-foreground mb-3">Escolha o seu País / Método</label>
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
                        <label className="block text-sm font-semibold text-foreground mb-3">Valor a depositar (Clube da Sueca = €)</label>
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
                                min="1"
                                step="0.01"
                                required
                                value={amountEur}
                                onChange={(e) => setAmountEur(e.target.value)}
                                className="block w-full rounded-xl border border-border bg-background pl-[60px] p-3 text-lg font-bold focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent text-foreground"
                                placeholder="10.00"
                            />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">O saldo no jogo será sempre em Euros (EUR).</p>
                    </div>

                    {/* Conversion Display */}
                    {region.id !== 'PT' && parseFloat(amountEur) > 0 && (
                        <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl space-y-2 border border-yellow-200 dark:border-yellow-800/30">
                            <p className="text-xs text-yellow-800 dark:text-yellow-600 font-semibold uppercase tracking-wider">Cotação Estimada</p>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total a pagar ({region.currency})</span>
                                <span className="text-lg font-bold text-gray-900 dark:text-white">{region.symbol} {localAmount}</span>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full rounded-xl bg-accent py-4 font-bold text-white shadow-md active:scale-[0.98] hover:brightness-110 transition-all flex items-center justify-center gap-2"
                    >
                        {region.id === 'PT' && <Smartphone className="w-5 h-5" />}
                        {region.id === 'BR' && <Banknote className="w-5 h-5" />}
                        {region.id === 'MZ' && <CreditCard className="w-5 h-5" />}
                        Avançar ({region.method})
                    </button>
                </form>
            )}

            {step === 2 && (
                <div className="space-y-6 text-center animate-in slide-in-from-right-4">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-accent/10 text-accent">
                        {region.id === 'PT' && <Smartphone className="h-8 w-8" />}
                        {region.id === 'BR' && <Banknote className="h-8 w-8" />}
                        {region.id === 'MZ' && <CreditCard className="h-8 w-8" />}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-foreground">Aguardando Pagamento</h3>
                        <p className="text-sm text-muted-foreground">
                            {region.id === 'PT' && "Aceite a notificação no seu MB Way"}
                            {region.id === 'BR' && "Escaneie o QR Code no seu App do Banco"}
                            {region.id === 'MZ' && "Confirme o PIN no seu M-Pesa"}
                        </p>
                    </div>

                    <div className="rounded-xl bg-muted/50 p-4 text-left space-y-3">
                        {region.id === 'PT' && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">Entidade</span>
                                    <span className="font-mono font-bold text-foreground">11249</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">Referência</span>
                                    <span className="font-mono font-bold text-foreground">123 456 789</span>
                                </div>
                            </>
                        )}
                        {region.id === 'BR' && (
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-40 h-40 bg-white p-2 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                                    <div className="grid grid-cols-4 gap-1 w-full h-full opacity-50">
                                        {Array(16).fill(0).map((_, i) => <div key={i} className="bg-black rounded-sm"></div>)}
                                    </div>
                                    <span className="absolute text-xs font-bold text-accent bg-white px-2">PIX FAKE</span>
                                </div>
                                <p className="text-xs text-center text-muted-foreground">00020126440014br.gov.bcb.pix0122suporte@oclubedasueca...</p>
                            </div>
                        )}
                        {region.id === 'MZ' && (
                            <>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">Entidade M-Pesa</span>
                                    <span className="font-mono font-bold text-foreground">12345</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground text-sm">Referência</span>
                                    <span className="font-mono font-bold text-foreground">SUECA</span>
                                </div>
                            </>
                        )}

                        <div className="flex justify-between border-t border-border pt-3 mt-2">
                            <span className="text-muted-foreground font-semibold">Valor Final</span>
                            <div className="text-right">
                                <p className="font-bold text-lg text-accent">{region.symbol} {localAmount}</p>
                                {region.id !== 'PT' && <p className="text-xs text-muted-foreground">Sera creditado €{amountEur} EUR</p>}
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
                    <p className="text-muted-foreground">O saldo de €{amountEur} EUR está na sua carteira.</p>
                    <p className="text-sm text-muted-foreground mt-8 animate-pulse text-accent">A redirecionar para o painel...</p>
                </div>
            )}
        </div>
    )
}
