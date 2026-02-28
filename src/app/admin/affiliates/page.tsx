'use client'

import { useEffect, useState } from 'react'
import { getAllAffiliates, updateAffiliateStatus, payAffiliate } from '@/features/affiliates/actions'
import { Users, Check, X, DollarSign, Ban } from 'lucide-react'
import Link from 'next/link'

export default function AdminAffiliatesPage() {
    const [affiliates, setAffiliates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')
    const [payingId, setPayingId] = useState<string | null>(null)
    const [payAmount, setPayAmount] = useState('')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const result = await getAllAffiliates()
        if (result.affiliates) setAffiliates(result.affiliates)
        setLoading(false)
    }

    async function handleStatusChange(id: string, status: string) {
        const result = await updateAffiliateStatus(id, status)
        if (result.error) setMessage(`âŒ ${result.error}`)
        else { setMessage(`âœ… Estado atualizado para ${status}`); loadData() }
    }

    async function handlePay(affiliateId: string) {
        const amount = parseFloat(payAmount)
        if (isNaN(amount) || amount <= 0) { setMessage('âŒ Valor invÃ¡lido'); return }
        const result = await payAffiliate(affiliateId, amount)
        if (result.error) setMessage(`âŒ ${result.error}`)
        else { setMessage('âœ… Pagamento processado!'); setPayingId(null); setPayAmount(''); loadData() }
    }

    if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">A carregar...</div>

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-700',
        approved: 'bg-green-100 text-green-700',
        rejected: 'bg-red-100 text-red-700',
        suspended: 'bg-gray-100 text-gray-700',
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <Link href="/admin" className="text-sm text-accent hover:underline">â† Admin</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">ðŸ¤ GestÃ£o de Afiliados</h1>
                </div>

                {message && (
                    <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm text-blue-700">
                        {message} <button onClick={() => setMessage('')} className="ml-2 font-bold">Ã—</button>
                    </div>
                )}

                <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                    <div className="border-b bg-gray-50 px-6 py-4">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Users className="h-5 w-5" /> Afiliados ({affiliates.length})
                        </h2>
                    </div>
                    <div className="divide-y">
                        {affiliates.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">Nenhum afiliado registado.</div>
                        ) : (
                            affiliates.map(aff => (
                                <div key={aff.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <span className="font-semibold text-gray-900">
                                                    {(aff.profile as any)?.username || 'Utilizador'}
                                                </span>
                                                <span className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[aff.status] || 'bg-gray-100'}`}>
                                                    {aff.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {aff.status === 'pending' && (
                                                <>
                                                    <button onClick={() => handleStatusChange(aff.id, 'approved')}
                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50" title="Aprovar">
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleStatusChange(aff.id, 'rejected')}
                                                        className="p-2 rounded-lg text-red-600 hover:bg-red-50" title="Rejeitar">
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            {aff.status === 'approved' && (
                                                <>
                                                    <button onClick={() => setPayingId(payingId === aff.id ? null : aff.id)}
                                                        className="p-2 rounded-lg text-green-600 hover:bg-green-50" title="Pagar">
                                                        <DollarSign className="h-4 w-4" />
                                                    </button>
                                                    <button onClick={() => handleStatusChange(aff.id, 'suspended')}
                                                        className="p-2 rounded-lg text-gray-600 hover:bg-gray-100" title="Suspender">
                                                        <Ban className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 flex gap-4">
                                        <span>Modelo: {aff.commission_model === 'revenue_share' ? `Rev Share ${aff.revenue_share_pct}%` : `CPA â‚¬${aff.cpa_amount}`}</span>
                                        <span>Ganhos: â‚¬{aff.total_earned?.toFixed(2)}</span>
                                        <span>Pago: â‚¬{aff.total_paid?.toFixed(2)}</span>
                                        <span>Pendente: â‚¬{((aff.total_earned || 0) - (aff.total_paid || 0)).toFixed(2)}</span>
                                    </div>

                                    {payingId === aff.id && (
                                        <div className="mt-3 flex gap-2">
                                            <input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={payAmount}
                                                onChange={(e) => setPayAmount(e.target.value)}
                                                placeholder="Montante a pagar..."
                                                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                                            />
                                            <button onClick={() => handlePay(aff.id)}
                                                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">
                                                Confirmar Pagamento
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
