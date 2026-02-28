'use client'

import { useEffect, useState } from 'react'
import { getUserBonuses, getVipStatus, redeemPromoCode } from '@/features/bonuses/actions'
import { Gift, Trophy, Star, Ticket } from 'lucide-react'

export default function UserBonusesPage() {
    const [bonuses, setBonuses] = useState<any[]>([])
    const [vip, setVip] = useState<any>(null)
    const [levels, setLevels] = useState<any[]>([])
    const [promoCode, setPromoCode] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)
        const [bonusResult, vipResult] = await Promise.all([
            getUserBonuses(),
            getVipStatus(),
        ])
        if (bonusResult.bonuses) setBonuses(bonusResult.bonuses)
        if (vipResult.vip) setVip(vipResult.vip)
        if (vipResult.levels) setLevels(vipResult.levels)
        setLoading(false)
    }

    async function handleRedeemCode(e: React.FormEvent) {
        e.preventDefault()
        if (!promoCode.trim()) return

        const result = await redeemPromoCode(promoCode)
        if (result.error) {
            setMessage(`âŒ ${result.error}`)
        } else {
            setMessage('âœ… CÃ³digo resgatado com sucesso!')
            setPromoCode('')
            loadData()
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center py-20 text-gray-500">A carregar...</div>
    }

    const currentLevel = vip?.level || levels[0]
    const nextLevel = levels.find((l: any) => l.sort_order === (currentLevel?.sort_order || 0) + 1)
    const progressToNext = nextLevel
        ? Math.min(100, ((vip?.lifetime_points || 0) / nextLevel.min_points) * 100)
        : 100

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-foreground">ðŸŽ PromoÃ§Ãµes e BÃ³nus</h1>

            {/* VIP Status Card */}
            <div className="rounded-2xl bg-gradient-to-br from-gray-900 to-gray-700 p-6 text-white shadow-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-300">NÃ­vel VIP</p>
                        <h2 className="text-2xl font-bold flex items-center gap-2">
                            <span>{currentLevel?.icon || 'â­'}</span>
                            <span>{currentLevel?.name || 'Bronze'}</span>
                        </h2>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-gray-300">Pontos</p>
                        <p className="text-2xl font-bold">{(vip?.lifetime_points || 0).toLocaleString()}</p>
                    </div>
                </div>

                {nextLevel && (
                    <div className="mt-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{currentLevel?.name}</span>
                            <span>{nextLevel.name} ({nextLevel.min_points} pts)</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-600 overflow-hidden">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all"
                                style={{ width: `${progressToNext}%` }}
                            />
                        </div>
                    </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                    <div className="rounded-lg bg-white/10 p-3">
                        <p className="text-gray-300">Cashback</p>
                        <p className="font-bold text-lg">{currentLevel?.cashback_rate || 0}%</p>
                    </div>
                    <div className="rounded-lg bg-white/10 p-3">
                        <p className="text-gray-300">Multiplicador BÃ³nus</p>
                        <p className="font-bold text-lg">{currentLevel?.bonus_multiplier || 1}x</p>
                    </div>
                </div>
            </div>

            {/* Redeem Promo Code */}
            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
                <h3 className="font-bold text-foreground flex items-center gap-2 mb-4">
                    <Ticket className="h-5 w-5 text-primary" /> CÃ³digo Promocional
                </h3>
                <form onSubmit={handleRedeemCode} className="flex gap-2">
                    <input
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        placeholder="Inserir cÃ³digo..."
                        className="flex-1 rounded-xl border border-input bg-background/50 px-4 py-2 text-sm uppercase text-foreground placeholder:text-foreground/50 focus:border-accent focus:outline-none"
                    />
                    <button type="submit"
                        className="rounded-xl bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                        Resgatar
                    </button>
                </form>
                {message && (
                    <p className="mt-2 text-sm text-gray-600">{message}</p>
                )}
            </div>

            {/* Active Bonuses */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b bg-gray-50 px-6 py-4">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <Gift className="h-5 w-5 text-green-600" /> Os Meus BÃ³nus
                    </h3>
                </div>
                <div className="divide-y">
                    {bonuses.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            <Gift className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                            <p>Sem bÃ³nus ativos de momento.</p>
                        </div>
                    ) : (
                        bonuses.map(ub => (
                            <div key={ub.id} className="p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-gray-900">
                                            {(ub.bonus as any)?.name || 'BÃ³nus'}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            Valor: <span className="font-bold text-green-600">â‚¬{ub.amount}</span>
                                        </p>
                                    </div>
                                    <span className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${ub.status === 'active' ? 'bg-green-100 text-green-700' :
                                        ub.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                            ub.status === 'expired' ? 'bg-gray-100 text-gray-700' :
                                                'bg-red-100 text-red-700'
                                        }`}>
                                        {ub.status === 'active' ? 'Ativo' :
                                            ub.status === 'completed' ? 'Completo' :
                                                ub.status === 'expired' ? 'Expirado' : 'Cancelado'}
                                    </span>
                                </div>
                                {ub.status === 'active' && ub.rollover_target > 0 && (
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                                            <span>Rollover: â‚¬{ub.wagered?.toFixed(2)} / â‚¬{ub.rollover_target?.toFixed(2)}</span>
                                            <span>{Math.min(100, (ub.wagered / ub.rollover_target * 100)).toFixed(0)}%</span>
                                        </div>
                                        <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
                                            <div
                                                className="h-full rounded-full bg-green-500 transition-all"
                                                style={{ width: `${Math.min(100, (ub.wagered / ub.rollover_target * 100))}%` }}
                                            />
                                        </div>
                                        {ub.expires_at && (
                                            <p className="mt-1 text-xs text-gray-400">
                                                Expira: {new Date(ub.expires_at).toLocaleDateString('pt-PT')}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    )
}
