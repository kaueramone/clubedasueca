'use client'

import { useEffect, useState } from 'react'
import { getAffiliateStatus, applyForAffiliate, createAffiliateLink } from '@/features/affiliates/actions'
import { Link2, Users, TrendingUp, DollarSign, Copy, Plus, Clock, CheckCircle } from 'lucide-react'

export default function AffiliateDashboardPage() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [newLinkCode, setNewLinkCode] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const result = await getAffiliateStatus()
        setData(result)
        setLoading(false)
    }

    async function handleApply() {
        const result = await applyForAffiliate()
        if (result.error) setMessage(`❌ ${result.error}`)
        else { setMessage('✅ Candidatura enviada!'); loadData() }
    }

    async function handleCreateLink(e: React.FormEvent) {
        e.preventDefault()
        if (!newLinkCode.trim()) return
        const result = await createAffiliateLink(newLinkCode)
        if (result.error) setMessage(`❌ ${result.error}`)
        else { setMessage('✅ Link criado!'); setNewLinkCode(''); loadData() }
    }

    if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">A carregar...</div>

    // Not yet an affiliate
    if (!data?.affiliate) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-white">🤝 Programa de Afiliados</h1>
                <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 text-white text-center">
                    <Users className="mx-auto h-12 w-12 mb-4 opacity-80" />
                    <h2 className="text-xl font-bold mb-2">Ganhe dinheiro a referir jogadores!</h2>
                    <p className="text-primary-foreground/90 mb-6 max-w-md mx-auto">
                        Receba até 25% de comissão sobre o rake gerado pelos jogadores que referir.
                    </p>
                    <button onClick={handleApply}
                        className="rounded-xl bg-white px-8 py-3 text-sm font-bold text-primary hover:bg-muted transition-colors">
                        Candidatar-me como Afiliado
                    </button>
                    {message && <p className="mt-4 text-sm">{message}</p>}
                </div>
            </div>
        )
    }

    const { affiliate, links, referrals, commissions, summary } = data

    // Pending approval
    if (affiliate.status === 'pending') {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-bold text-white">🤝 Programa de Afiliados</h1>
                <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-8 text-center">
                    <Clock className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
                    <h2 className="text-lg font-bold text-yellow-800 mb-2">Candidatura em análise</h2>
                    <p className="text-yellow-700">A sua candidatura está a ser revista pela equipa. Será notificado quando for aprovada.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">🤝 Painel de Afiliado</h1>

            {message && (
                <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm text-blue-700">
                    {message} <button onClick={() => setMessage('')} className="ml-2 font-bold">×</button>
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard icon={<DollarSign className="h-5 w-5" />} label="Total Ganho" value={`€${summary.total_earned.toFixed(2)}`} color="text-green-600" />
                <StatCard icon={<Clock className="h-5 w-5" />} label="Pendente" value={`€${summary.pending.toFixed(2)}`} color="text-yellow-600" />
                <StatCard icon={<Users className="h-5 w-5" />} label="Referidos" value={summary.total_referrals} color="text-accent" />
                <StatCard icon={<TrendingUp className="h-5 w-5" />} label="Clicks" value={summary.total_clicks} color="text-primary" />
            </div>

            {/* Create Link */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                    <Link2 className="h-5 w-5 text-indigo-600" /> Criar Link de Afiliado
                </h3>
                <form onSubmit={handleCreateLink} className="flex gap-2">
                    <div className="flex items-center flex-1 rounded-xl border border-gray-300 overflow-hidden">
                        <span className="bg-gray-100 px-3 py-2 text-sm text-gray-500">apostanasueca.pt/?ref=</span>
                        <input
                            value={newLinkCode}
                            onChange={(e) => setNewLinkCode(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                            placeholder="meucodigo"
                            className="flex-1 px-3 py-2 text-sm focus:outline-none"
                        />
                    </div>
                    <button type="submit"
                        className="rounded-xl bg-indigo-600 px-6 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                        <Plus className="h-4 w-4" />
                    </button>
                </form>
            </div>

            {/* Links List */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b bg-gray-50 px-6 py-4">
                    <h3 className="font-semibold text-gray-700">Os Meus Links ({links.length})</h3>
                </div>
                <div className="divide-y">
                    {links.map((link: any) => (
                        <div key={link.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                            <div>
                                <div className="flex items-center gap-2">
                                    <code className="rounded bg-gray-100 px-2 py-1 text-sm font-bold text-gray-900">{link.code}</code>
                                </div>
                                <div className="mt-1 text-xs text-gray-500 space-x-3">
                                    <span>Clicks: {link.clicks}</span>
                                    <span>Registos: {link.registrations}</span>
                                </div>
                            </div>
                            <button
                                onClick={() => { navigator.clipboard.writeText(link.url || `https://apostanasueca.pt/?ref=${link.code}`); setMessage('Link copiado!') }}
                                className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                title="Copiar link">
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {links.length === 0 && <div className="py-8 text-center text-gray-500 text-sm">Nenhum link criado.</div>}
                </div>
            </div>

            {/* Recent Referrals */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b bg-gray-50 px-6 py-4">
                    <h3 className="font-semibold text-gray-700">Referidos ({referrals.length})</h3>
                </div>
                <div className="divide-y">
                    {referrals.map((ref: any) => (
                        <div key={ref.id} className="flex items-center justify-between p-4">
                            <div>
                                <span className="font-medium text-gray-900">{ref.referred_user?.username || 'Utilizador'}</span>
                                <span className="ml-2 text-xs text-gray-500">{new Date(ref.created_at).toLocaleDateString('pt-PT')}</span>
                            </div>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ref.is_qualified ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                }`}>
                                {ref.is_qualified ? <><CheckCircle className="h-3 w-3" /> Qualificado</> : 'Pendente'}
                            </span>
                        </div>
                    ))}
                    {referrals.length === 0 && <div className="py-8 text-center text-gray-500 text-sm">Sem referidos ainda.</div>}
                </div>
            </div>

            {/* Recent Commissions */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b bg-gray-50 px-6 py-4">
                    <h3 className="font-semibold text-gray-700">Comissões Recentes</h3>
                </div>
                <div className="divide-y">
                    {commissions.slice(0, 20).map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between p-4 text-sm">
                            <div>
                                <span className="font-medium text-gray-900">€{c.amount.toFixed(2)}</span>
                                <span className="ml-2 text-xs text-gray-500">{c.source_type}</span>
                                <span className="ml-2 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('pt-PT')}</span>
                            </div>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === 'paid' ? 'bg-green-100 text-green-700' :
                                c.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-gray-100 text-gray-700'
                                }`}>{c.status === 'paid' ? 'Pago' : c.status === 'pending' ? 'Pendente' : c.status}</span>
                        </div>
                    ))}
                    {commissions.length === 0 && <div className="py-8 text-center text-gray-500 text-sm">Sem comissões ainda.</div>}
                </div>
            </div>
        </div>
    )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
    return (
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-gray-100">
            <div className={`${color} mb-2`}>{icon}</div>
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
    )
}
