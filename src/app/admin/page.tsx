'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAdminStats } from './actions'
import { Users, DollarSign, Activity, ActivityIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

const StatCard = ({ title, value, icon: Icon, colorClass }: any) => (
    <Card className="p-6 flex items-center justify-between border border-border/50 shadow-sm">
        <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground mt-2">{value}</p>
        </div>
        <div className={`p-4 rounded-xl ${colorClass}`}>
            <Icon className="h-8 w-8" />
        </div>
    </Card>
)

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, balance: 0, games: 0, online: 0 })
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        const loadData = async () => {
            setLoading(true)
            const s = await getAdminStats()
            setStats(prev => ({ ...prev, ...s }))
            setLoading(false)
        }

        loadData()

        // Online Presence Subscription
        const channel = supabase.channel('online-users')
            .on('presence', { event: 'sync' }, () => {
                const state = channel.presenceState()
                const count = Object.keys(state).length
                setStats(prev => ({ ...prev, online: count }))
            })
            .subscribe()

        return () => { supabase.removeChannel(channel) }
    }, [])

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-foreground">Visão Geral</h1>
                    <p className="text-muted-foreground mt-1">Bem-vindo ao centro de comando do Clube da Sueca.</p>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 bg-success/10 border border-success/20 text-success rounded-xl text-sm font-bold shadow-sm">
                        <div className="w-2.5 h-2.5 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(52,199,89,0.8)]" />
                        {stats.online} Online Agora
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-12 text-center text-muted-foreground animate-pulse">A carregar estatísticas vitais...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Utilizadores Registados"
                        value={stats.users}
                        icon={Users}
                        colorClass="bg-primary/10 text-primary border border-primary/20"
                    />
                    <StatCard
                        title="Saldo em Circulação (Pot)"
                        value={`€${stats.balance.toFixed(2)}`}
                        icon={DollarSign}
                        colorClass="bg-accent/10 text-accent border border-accent/20"
                    />
                    <StatCard
                        title="Jogos Dealizados"
                        value={stats.games}
                        icon={ActivityIcon}
                        colorClass="bg-muted text-muted-foreground border border-border"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                <Card className="p-6">
                    <h3 className="text-lg font-bold mb-4 font-serif">Ações Rápidas</h3>
                    <div className="grid grid-cols-2 gap-4">
                        <a href="/admin/crm" className="p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-colors group">
                            <span className="block font-bold text-foreground group-hover:text-accent">CRM & E-mails &rarr;</span>
                            <span className="text-sm text-muted-foreground mt-1 block">Gerir campanhas e métricas de jogadores.</span>
                        </a>
                        <a href="/admin/banners" className="p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-colors group">
                            <span className="block font-bold text-foreground group-hover:text-accent">Novo Banner &rarr;</span>
                            <span className="text-sm text-muted-foreground mt-1 block">Destacar um torneio na Landing Page.</span>
                        </a>
                    </div>
                </Card>
            </div>
        </div>
    )
}

