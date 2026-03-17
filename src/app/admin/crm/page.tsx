'use client'

import { useEffect, useState } from 'react'
import { getCrmUsers, getAutomationRules, saveAutomationRule, getEmailLogs } from '@/features/crm/actions'
import { Users, Mail, Play, Pause, Search, Target, DollarSign, Activity, FileText } from 'lucide-react'
import Link from 'next/link'

export default function AdminCrmPage() {
    const [tab, setTab] = useState<'users' | 'automations' | 'logs'>('users')
    const [users, setUsers] = useState<any[]>([])
    const [rules, setRules] = useState<any[]>([])
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [segmentFilter, setSegmentFilter] = useState('all')
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => { loadData() }, [tab, segmentFilter, searchTerm])

    async function loadData() {
        setLoading(true)
        if (tab === 'users') {
            const res = await getCrmUsers({ segment: segmentFilter, search: searchTerm })
            if (res.users) setUsers(res.users)
        } else if (tab === 'automations') {
            const res = await getAutomationRules()
            if (res.rules) setRules(res.rules)
        } else if (tab === 'logs') {
            const res = await getEmailLogs()
            if (res.logs) setLogs(res.logs)
        }
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <Link href="/admin" className="text-sm text-accent hover:underline">← Admin</Link>
                    <h1 className="text-2xl font-bold text-foreground mt-1">🎯 CRM & Retenção</h1>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-border">
                    <button onClick={() => setTab('users')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        👥 Utilizadores (Segmentação)
                    </button>
                    <button onClick={() => setTab('automations')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'automations' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        ⚡ Regras de Automação
                    </button>
                    <button onClick={() => setTab('logs')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        📧 Logs de Email
                    </button>
                </div>

                {/* Users Tab */}
                {tab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground/70" />
                                <input
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Procurar por nome ou email..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <select
                                value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-border bg-background text-foreground"
                            >
                                <option value="all">Todos os Segmentos</option>
                                <option value="new">Novos</option>
                                <option value="active">Ativos</option>
                                <option value="vip">VIPs</option>
                                <option value="churning">Em risco de abandono</option>
                                <option value="dormant">Dorminhocos (&gt;30 dias)</option>
                            </select>
                        </div>

                        <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
                            <table className="min-w-full divide-y divide-border text-sm">
                                <thead className="bg-background text-left">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-foreground/80">Utilizador</th>
                                        <th className="px-6 py-3 font-semibold text-foreground/80">Segmento</th>
                                        <th className="px-6 py-3 font-semibold text-foreground/80">LTV (Lucro)</th>
                                        <th className="px-6 py-3 font-semibold text-foreground/80">Depósitos</th>
                                        <th className="px-6 py-3 font-semibold text-foreground/80">Jogos</th>
                                        <th className="px-6 py-3 font-semibold text-foreground/80">Última Atividade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border bg-card">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">A carregar...</td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Nenhum utilizador encontrado.</td></tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u.id} className="hover:bg-muted/30">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-foreground">{(u.profile as any)?.username}</div>
                                                    <div className="text-xs text-muted-foreground">{(u.profile as any)?.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.segment === 'vip' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        u.segment === 'active' ? 'bg-success/10 text-success' :
                                                            u.segment === 'churning' ? 'bg-orange-500/10 text-orange-400' :
                                                                u.segment === 'dormant' ? 'bg-red-500/10 text-red-400' :
                                                                    'bg-muted text-muted-foreground'
                                                        }`}>{u.segment}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-foreground">€{u.ltv?.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-muted-foreground">€{u.total_deposited?.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-muted-foreground">{u.games_played} jogados<br /><span className="text-xs">{u.games_won} vitórias</span></td>
                                                <td className="px-6 py-4 text-muted-foreground">
                                                    {u.last_game_at ? new Date(u.last_game_at).toLocaleDateString('pt-PT') : 'Nunca'}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Automations Tab (Placeholder for full UI, just showing list) */}
                {tab === 'automations' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center bg-muted p-4 rounded-xl border border-border">
                            <p className="text-primary text-sm">
                                As regras de automação disparam emails quando certos eventos ocorrem (ex: registo, inatividade).
                                NOTA: Integração com provedor SMTP (SendGrid/Resend) requer configuração adicional.
                            </p>
                            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Nova Regra</button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {rules.map(rule => (
                                <div key={rule.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-foreground">{rule.name}</h3>
                                        <span className={`inline-block text-xs font-bold rounded-full px-2 py-1 ${rule.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                            {rule.is_active ? 'Ativa' : 'Pausada'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-1"><strong>Trigger:</strong> {rule.trigger}</p>
                                    <p className="text-sm text-muted-foreground mb-3"><strong>Assunto:</strong> {rule.subject}</p>
                                    <div className="flex gap-2">
                                        <button className="text-xs font-semibold text-accent hover:underline">Editar</button>
                                        <button className="text-xs font-semibold text-muted-foreground hover:underline">Ver preview</button>
                                    </div>
                                </div>
                            ))}
                            {rules.length === 0 && <p className="text-muted-foreground col-span-2 text-center py-8">Nenhuma regra definida.</p>}
                        </div>
                    </div>
                )}

                {/* Logs Tab */}
                {tab === 'logs' && (
                    <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
                        <table className="min-w-full divide-y divide-border text-sm">
                            <thead className="bg-background text-left">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-foreground/80">Data</th>
                                    <th className="px-6 py-3 font-semibold text-foreground/80">Utilizador</th>
                                    <th className="px-6 py-3 font-semibold text-foreground/80">Assunto</th>
                                    <th className="px-6 py-3 font-semibold text-foreground/80">Regra associada</th>
                                    <th className="px-6 py-3 font-semibold text-foreground/80">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 text-muted-foreground">{new Date(log.created_at).toLocaleString('pt-PT')}</td>
                                        <td className="px-6 py-4 font-medium text-foreground">{(log.profile as any)?.email}</td>
                                        <td className="px-6 py-4 text-foreground/80">{log.subject}</td>
                                        <td className="px-6 py-4 text-muted-foreground">{(log.rule as any)?.name || 'Manual'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${log.status === 'sent' ? 'bg-blue-500/10 text-blue-400' :
                                                log.status === 'opened' ? 'bg-success/10 text-success' :
                                                    log.status === 'failed' ? 'bg-red-500/10 text-red-400' :
                                                        'bg-muted text-muted-foreground'
                                                }`}>{log.status}</span>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Nenhum email enviado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
