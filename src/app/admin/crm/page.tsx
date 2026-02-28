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
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mx-auto max-w-7xl space-y-6">
                <div>
                    <Link href="/admin" className="text-sm text-accent hover:underline">â† Admin</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">ðŸŽ¯ CRM & RetenÃ§Ã£o</h1>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button onClick={() => setTab('users')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'users' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        ðŸ‘¥ Utilizadores (SegmentaÃ§Ã£o)
                    </button>
                    <button onClick={() => setTab('automations')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'automations' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        âš¡ Regras de AutomaÃ§Ã£o
                    </button>
                    <button onClick={() => setTab('logs')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'logs' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        ðŸ“§ Logs de Email
                    </button>
                </div>

                {/* Users Tab */}
                {tab === 'users' && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Procurar por nome ou email..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>
                            <select
                                value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)}
                                className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white"
                            >
                                <option value="all">Todos os Segmentos</option>
                                <option value="new">Novos</option>
                                <option value="active">Ativos</option>
                                <option value="vip">VIPs</option>
                                <option value="churning">Em risco de abandono</option>
                                <option value="dormant">Dorminhocos (&gt;30 dias)</option>
                            </select>
                        </div>

                        <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                                <thead className="bg-gray-50 text-left">
                                    <tr>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Utilizador</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Segmento</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">LTV (Lucro)</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">DepÃ³sitos</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Jogos</th>
                                        <th className="px-6 py-3 font-semibold text-gray-700">Ãšltima Atividade</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {loading ? (
                                        <tr><td colSpan={6} className="py-8 text-center text-gray-500">A carregar...</td></tr>
                                    ) : users.length === 0 ? (
                                        <tr><td colSpan={6} className="py-8 text-center text-gray-500">Nenhum utilizador encontrado.</td></tr>
                                    ) : (
                                        users.map(u => (
                                            <tr key={u.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900">{(u.profile as any)?.username}</div>
                                                    <div className="text-xs text-gray-500">{(u.profile as any)?.email}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${u.segment === 'vip' ? 'bg-yellow-100 text-yellow-800' :
                                                        u.segment === 'active' ? 'bg-green-100 text-green-800' :
                                                            u.segment === 'churning' ? 'bg-orange-100 text-orange-800' :
                                                                u.segment === 'dormant' ? 'bg-red-100 text-red-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                        }`}>{u.segment}</span>
                                                </td>
                                                <td className="px-6 py-4 font-bold text-gray-900">â‚¬{u.ltv?.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-gray-500">â‚¬{u.total_deposited?.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-gray-500">{u.games_played} jogados<br /><span className="text-xs">{u.games_won} vitÃ³rias</span></td>
                                                <td className="px-6 py-4 text-gray-500">
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
                                As regras de automaÃ§Ã£o disparam emails quando certos eventos ocorrem (ex: registo, inatividade).
                                NOTA: IntegraÃ§Ã£o com provedor SMTP (SendGrid/Resend) requer configuraÃ§Ã£o adicional.
                            </p>
                            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white">Nova Regra</button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            {rules.map(rule => (
                                <div key={rule.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-gray-900">{rule.name}</h3>
                                        <span className={`inline-block text-xs font-bold rounded-full px-2 py-1 ${rule.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                            {rule.is_active ? 'Ativa' : 'Pausada'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-1"><strong>Trigger:</strong> {rule.trigger}</p>
                                    <p className="text-sm text-gray-600 mb-3"><strong>Assunto:</strong> {rule.subject}</p>
                                    <div className="flex gap-2">
                                        <button className="text-xs font-semibold text-accent hover:underline">Editar</button>
                                        <button className="text-xs font-semibold text-gray-600 hover:underline">Ver preview</button>
                                    </div>
                                </div>
                            ))}
                            {rules.length === 0 && <p className="text-gray-500 col-span-2 text-center py-8">Nenhuma regra definida.</p>}
                        </div>
                    </div>
                )}

                {/* Logs Tab */}
                {tab === 'logs' && (
                    <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50 text-left">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-gray-700">Data</th>
                                    <th className="px-6 py-3 font-semibold text-gray-700">Utilizador</th>
                                    <th className="px-6 py-3 font-semibold text-gray-700">Assunto</th>
                                    <th className="px-6 py-3 font-semibold text-gray-700">Regra associada</th>
                                    <th className="px-6 py-3 font-semibold text-gray-700">Estado</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 bg-white">
                                {logs.map(log => (
                                    <tr key={log.id}>
                                        <td className="px-6 py-4 text-gray-500">{new Date(log.created_at).toLocaleString('pt-PT')}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{(log.profile as any)?.email}</td>
                                        <td className="px-6 py-4 text-gray-700">{log.subject}</td>
                                        <td className="px-6 py-4 text-gray-500">{(log.rule as any)?.name || 'Manual'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${log.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                                                log.status === 'opened' ? 'bg-green-100 text-green-800' :
                                                    log.status === 'failed' ? 'bg-red-100 text-red-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>{log.status}</span>
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-gray-500">Nenhum email enviado.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
