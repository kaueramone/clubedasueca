'use client'

import { useEffect, useState } from 'react'
import { getAllBonuses, createBonus, updateBonus, getAllPromoCodes, createPromoCode } from '@/features/bonuses/actions'
import { Gift, Tag, Plus, Pause, Play, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'

function BonusTypeLabel({ type }: { type: string }) {
    const labels: Record<string, { text: string; color: string }> = {
        welcome: { text: 'Boas-vindas', color: 'bg-green-100 text-green-700' },
        deposit_match: { text: 'Match Depósito', color: 'bg-blue-100 text-blue-700' },
        reload: { text: 'Recarga', color: 'bg-primary/10 text-primary' },
        free_play: { text: 'Jogo Grátis', color: 'bg-yellow-100 text-yellow-700' },
        cashback: { text: 'Cashback', color: 'bg-pink-100 text-pink-700' },
        promo_code: { text: 'Promo Code', color: 'bg-orange-100 text-orange-700' },
        vip_reward: { text: 'VIP Reward', color: 'bg-indigo-100 text-indigo-700' },
    }
    const l = labels[type] || { text: type, color: 'bg-gray-100 text-gray-700' }
    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${l.color}`}>{l.text}</span>
}

export default function AdminBonusesPage() {
    const [bonuses, setBonuses] = useState<any[]>([])
    const [promoCodes, setPromoCodes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreateBonus, setShowCreateBonus] = useState(false)
    const [showCreatePromo, setShowCreatePromo] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [bonusResult, promoResult] = await Promise.all([
            getAllBonuses(),
            getAllPromoCodes(),
        ])
        if (bonusResult.bonuses) setBonuses(bonusResult.bonuses)
        if (promoResult.promoCodes) setPromoCodes(promoResult.promoCodes)
        setLoading(false)
    }

    async function handleCreateBonus(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        const result = await createBonus(formData)
        if (result.error) {
            setMessage(`Erro: ${result.error}`)
        } else {
            setMessage('Bónus criado com sucesso!')
            setShowCreateBonus(false)
            form.reset()
            loadData()
        }
    }

    async function handleCreatePromo(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const form = e.currentTarget
        const formData = new FormData(form)
        const result = await createPromoCode(formData)
        if (result.error) {
            setMessage(`Erro: ${result.error}`)
        } else {
            setMessage('Código criado com sucesso!')
            setShowCreatePromo(false)
            form.reset()
            loadData()
        }
    }

    async function handleToggleStatus(bonusId: string, currentStatus: string) {
        const newStatus = currentStatus === 'active' ? 'paused' : 'active'
        const result = await updateBonus(bonusId, { status: newStatus })
        if (result.error) {
            setMessage(`Erro: ${result.error}`)
        } else {
            loadData()
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center py-20 text-gray-500">A carregar...</div>
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/admin" className="text-sm text-accent hover:underline">← Admin</Link>
                        <h1 className="text-2xl font-bold text-gray-900 mt-1">🎁 Promoções e Bónus</h1>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowCreateBonus(!showCreateBonus)}
                            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors">
                            <Plus className="h-4 w-4" /> Novo Bónus
                        </button>
                        <button onClick={() => setShowCreatePromo(!showCreatePromo)}
                            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                            <Tag className="h-4 w-4" /> Novo Código
                        </button>
                    </div>
                </div>

                {message && (
                    <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm text-blue-700">
                        {message}
                        <button onClick={() => setMessage('')} className="ml-2 font-bold">×</button>
                    </div>
                )}

                {/* Create Bonus Form */}
                {showCreateBonus && (
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Criar Novo Bónus</h2>
                        <form onSubmit={handleCreateBonus} className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                                <input name="name" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Bónus de Boas-Vindas" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
                                <select name="type" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                    <option value="welcome">Boas-vindas</option>
                                    <option value="deposit_match">Match Depósito</option>
                                    <option value="reload">Recarga</option>
                                    <option value="free_play">Jogo Grátis</option>
                                    <option value="cashback">Cashback</option>
                                    <option value="promo_code">Promo Code</option>
                                    <option value="vip_reward">VIP Reward</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Valor Fixo (€)</label>
                                <input name="amount" type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="5.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Percentual (%)</label>
                                <input name="percentage" type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="100" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Máximo (€)</label>
                                <input name="max_amount" type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="50.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Depósito Mínimo (€)</label>
                                <input name="min_deposit" type="number" step="0.01" min="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="10.00" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rollover (x)</label>
                                <input name="rollover_multiplier" type="number" step="0.1" min="0" defaultValue="1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Validade (dias)</label>
                                <input name="valid_days" type="number" min="1" defaultValue="30" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. usos globais</label>
                                <input name="max_uses" type="number" min="1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ilimitado" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. por utilizador</label>
                                <input name="max_per_user" type="number" min="1" defaultValue="1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Segmento</label>
                                <select name="user_segment" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                    <option value="all">Todos</option>
                                    <option value="new">Novos</option>
                                    <option value="vip_bronze">VIP Bronze</option>
                                    <option value="vip_prata">VIP Prata</option>
                                    <option value="vip_ouro">VIP Ouro</option>
                                    <option value="vip_platina">VIP Platina</option>
                                    <option value="vip_diamante">VIP Diamante</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                                <textarea name="description" rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Descrição do bónus..." />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowCreateBonus(false)}
                                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                                <button type="submit"
                                    className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white hover:bg-green-700">Criar Bónus</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Create Promo Code Form */}
                {showCreatePromo && (
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Criar Código Promocional</h2>
                        <form onSubmit={handleCreatePromo} className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                                <input name="code" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase" placeholder="BEMVINDO2024" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bónus Associado *</label>
                                <select name="bonus_id" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm">
                                    <option value="">Selecionar bónus...</option>
                                    {bonuses.map(b => (
                                        <option key={b.id} value={b.id}>{b.name} ({b.type})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Máx. resgates</label>
                                <input name="max_redemptions" type="number" min="1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" placeholder="Ilimitado" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Válido até</label>
                                <input name="valid_until" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowCreatePromo(false)}
                                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                                <button type="submit"
                                    className="rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90">Criar Código</button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Bonuses List */}
                <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                    <div className="border-b bg-gray-50 px-6 py-4">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Gift className="h-5 w-5" /> Bónus ({bonuses.length})
                        </h2>
                    </div>
                    <div className="divide-y">
                        {bonuses.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">Nenhum bónus criado.</div>
                        ) : (
                            bonuses.map(bonus => (
                                <div key={bonus.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4 flex-1 min-w-0">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-gray-900">{bonus.name}</span>
                                                <BonusTypeLabel type={bonus.type} />
                                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${bonus.status === 'active' ? 'bg-green-100 text-green-700' :
                                                        bonus.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-gray-100 text-gray-700'
                                                    }`}>{bonus.status}</span>
                                            </div>
                                            <div className="mt-1 text-xs text-gray-500 space-x-3">
                                                {bonus.amount && <span>Fixo: €{bonus.amount}</span>}
                                                {bonus.percentage && <span>Match: {bonus.percentage}%</span>}
                                                {bonus.max_amount && <span>Máx: €{bonus.max_amount}</span>}
                                                <span>Rollover: {bonus.rollover_multiplier}x</span>
                                                <span>Usos: {bonus.current_uses}{bonus.max_uses ? `/${bonus.max_uses}` : ''}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button onClick={() => handleToggleStatus(bonus.id, bonus.status)}
                                        className={`p-2 rounded-lg transition-colors ${bonus.status === 'active'
                                                ? 'text-yellow-600 hover:bg-yellow-50'
                                                : 'text-green-600 hover:bg-green-50'
                                            }`}
                                        title={bonus.status === 'active' ? 'Pausar' : 'Ativar'}>
                                        {bonus.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Promo Codes List */}
                <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                    <div className="border-b bg-gray-50 px-6 py-4">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <Tag className="h-5 w-5" /> Códigos Promocionais ({promoCodes.length})
                        </h2>
                    </div>
                    <div className="divide-y">
                        {promoCodes.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">Nenhum código criado.</div>
                        ) : (
                            promoCodes.map(promo => (
                                <div key={promo.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <code className="rounded bg-gray-100 px-2 py-1 text-sm font-bold text-gray-900">{promo.code}</code>
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                }`}>{promo.is_active ? 'Ativo' : 'Inativo'}</span>
                                        </div>
                                        <div className="mt-1 text-xs text-gray-500 space-x-3">
                                            <span>Bónus: {(promo.bonus as any)?.name || '—'}</span>
                                            <span>Resgates: {promo.current_redemptions}{promo.max_redemptions ? `/${promo.max_redemptions}` : ''}</span>
                                            {promo.valid_until && <span>Válido até: {new Date(promo.valid_until).toLocaleDateString('pt-PT')}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(promo.code)}
                                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                        title="Copiar código">
                                        <Copy className="h-4 w-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
