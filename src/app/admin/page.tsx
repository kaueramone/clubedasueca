'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAdminStats, getUsers, toggleBanUser, promoteToAdmin, getTransactions } from './actions'
import { Users, DollarSign, Activity, AlertCircle, Shield, Ban, CheckCircle, Search, ArrowRight, User } from 'lucide-react'
import Link from 'next/link'

// Quick UI components
const StatCard = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-${color}-100 text-${color}-600`}>
            <Icon className="h-6 w-6" />
        </div>
    </div>
)

export default function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, balance: 0, games: 0, online: 0 })
    const [activeTab, setActiveTab] = useState('overview')
    const [users, setUsers] = useState<any[]>([])
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    const supabase = createClient()

    useEffect(() => {
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

    const loadData = async () => {
        setLoading(true)
        const s = await getAdminStats()
        setStats(prev => ({ ...prev, ...s }))

        const u = await getUsers(1, searchTerm)
        setUsers(u.users || [])

        const t = await getTransactions()
        setTransactions(t || [])

        setLoading(false)
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (activeTab === 'users') {
                getUsers(1, searchTerm).then(res => setUsers(res.users || []))
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm, activeTab])

    const handleBan = async (userId: string, current: boolean) => {
        if (!confirm(`Tem a certeza que quer ${current ? 'desbanir' : 'banir'} este utilizador?`)) return
        await toggleBanUser(userId, current)
        loadData()
    }

    const handlePromote = async (userId: string) => {
        if (!confirm('Promover a Admin?')) return
        await promoteToAdmin(userId)
        loadData()
    }

    return (
        <div className="min-h-screen bg-gray-50 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                            <Shield className="h-8 w-8 text-accent" />
                            Painel Administrativo
                        </h1>
                        <p className="text-gray-500">Monitorização em tempo real.</p>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-bold animate-pulse">
                            <div className="w-2 h-2 bg-green-500 rounded-full" />
                            {stats.online} Online Agora
                        </div>
                        <Link href="/dashboard" className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition">
                            Voltar ao Jogo
                        </Link>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'overview' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Visão Geral
                    </button>
                    <button
                        onClick={() => setActiveTab('users')}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'users' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Gerir Utilizadores
                    </button>
                    <button
                        onClick={() => setActiveTab('transactions')}
                        className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 ${activeTab === 'transactions' ? 'border-accent text-accent' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        Transações
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 text-center text-gray-500">A carregar dados...</div>
                ) : (
                    <>
                        {activeTab === 'overview' && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                                <StatCard title="Utilizadores Totais" value={stats.users} icon={Users} color="blue" />
                                <StatCard title="Saldo em Circulação" value={`€${stats.balance.toFixed(2)}`} icon={DollarSign} color="green" />
                                <StatCard title="Jogos Realizados" value={stats.games} icon={Activity} color="purple" />
                            </div>
                        )}

                        {activeTab === 'users' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Pesquisar por nome..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-accent/50 transition-shadow"
                                    />
                                </div>
                                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                    <table className="w-full text-left text-sm text-gray-500">
                                        <thead className="bg-gray-50 text-gray-900 font-medium">
                                            <tr>
                                                <th className="px-6 py-4">Utilizador</th>
                                                <th className="px-6 py-4">Role</th>
                                                <th className="px-6 py-4">Status</th>
                                                <th className="px-6 py-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {users.map((user) => (
                                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-6 py-4 flex items-center gap-3">
                                                        <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                            {user.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover" /> : <User className="h-4 w-4" />}
                                                        </div>
                                                        <span className="font-medium text-gray-900">{user.username || 'Sem Nome'}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-600'}`}>
                                                            {user.role || 'user'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${user.is_banned ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                                            {user.is_banned ? 'Banido' : 'Ativo'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right space-x-2">
                                                        {user.role !== 'admin' && (
                                                            <button
                                                                onClick={() => handlePromote(user.id)}
                                                                className="text-primary hover:text-primary font-medium text-xs"
                                                            >
                                                                Promover
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => handleBan(user.id, user.is_banned)}
                                                            className={`font-medium text-xs ${user.is_banned ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'}`}
                                                        >
                                                            {user.is_banned ? 'Desbanir' : 'Banir'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {activeTab === 'transactions' && (
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden animate-in fade-in">
                                <table className="w-full text-left text-sm text-gray-500">
                                    <thead className="bg-gray-50 text-gray-900 font-medium">
                                        <tr>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Utilizador</th>
                                            <th className="px-6 py-4">Tipo</th>
                                            <th className="px-6 py-4">Valor</th>
                                            <th className="px-6 py-4">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {transactions.map((tx) => (
                                            <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4">{new Date(tx.created_at).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {tx.wallet?.user?.username || 'Unknown'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${tx.type === 'deposit' ? 'bg-green-100 text-green-700' :
                                                        tx.type === 'withdraw' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {tx.type === 'deposit' ? 'Depósito' : tx.type === 'withdraw' ? 'Levantamento' : 'Jogo'}
                                                    </span>
                                                </td>
                                                <td className={`px-6 py-4 font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {tx.amount > 0 ? '+' : ''}€{Math.abs(tx.amount).toFixed(2)}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400 text-xs">
                                                    {tx.description}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
