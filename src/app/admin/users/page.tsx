'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getUsers, toggleBanUser, promoteToAdmin } from '../actions'
import { User, Search, Shield, Ban, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

export default function AdminUsers() {
    const [users, setUsers] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        const u = await getUsers(1, searchTerm)
        setUsers(u.users || [])
        setLoading(false)
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            getUsers(1, searchTerm).then(res => setUsers(res.users || []))
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm])

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
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-foreground">Utilizadores</h1>
                    <p className="text-muted-foreground mt-1">Gestão de acessos e baniuamentos.</p>
                </div>
            </div>

            <Card className="p-6">
                <div className="relative mb-6 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                        type="text"
                        placeholder="Pesquisar por nome de utilizador..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground animate-pulse">A procurar carteiras de identidade...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-muted-foreground">
                            <thead className="bg-muted/50 text-foreground font-medium border-b border-border">
                                <tr>
                                    <th className="px-6 py-4">Utilizador</th>
                                    <th className="px-6 py-4">Role</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                                        <td className="px-6 py-4 flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border border-border">
                                                {user.avatar_url ? <img src={user.avatar_url} className="h-full w-full object-cover" /> : <User className="h-4 w-4 text-primary" />}
                                            </div>
                                            <span className="font-semibold text-foreground">{user.username || 'Sem Nome'}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.role === 'admin' ? 'secondary' : 'outline'}>
                                                {user.role || 'user'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4">
                                            <Badge variant={user.is_banned ? 'destructive' : 'default'} className={!user.is_banned ? "bg-success hover:bg-success" : ""}>
                                                {user.is_banned ? 'Banido' : 'Ativo'}
                                            </Badge>
                                        </td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            {user.role !== 'admin' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handlePromote(user.id)}
                                                    className="text-primary hover:text-primary"
                                                >
                                                    Promover Admin
                                                </Button>
                                            )}
                                            <Button
                                                variant={user.is_banned ? "outline" : "danger"}
                                                size="sm"
                                                onClick={() => handleBan(user.id, user.is_banned)}
                                            >
                                                {user.is_banned ? 'Desbanir' : 'Banir'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    )
}
