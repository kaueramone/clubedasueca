'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Search, User, Trash2, X, UserPlus, Loader2, Check } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'
import { getFriendsForInvite, sendTableInvite } from '@/features/game/actions'

interface Friend {
    id: string
    username: string
    avatar_url: string | null
}

interface InviteModalState {
    gameId: string
    seatPosition: number
}

export function LobbyGrid({ initialGames, currentUser, onJoinGame, onCancelGame }: { initialGames: any[], currentUser: any, onJoinGame: any, onCancelGame: any }) {
    const [games, setGames] = useState<any[]>(initialGames)
    const [search, setSearch] = useState('')
    const supabase = createClient()

    // Invite modal state
    const [inviteModal, setInviteModal] = useState<InviteModalState | null>(null)
    const [friends, setFriends] = useState<Friend[]>([])
    const [loadingFriends, setLoadingFriends] = useState(false)
    const [inviteSent, setInviteSent] = useState<Record<string, boolean>>({})
    const [sendingInvite, setSendingInvite] = useState<string | null>(null)

    useEffect(() => {
        setGames(initialGames)
    }, [initialGames])

    useEffect(() => {
        const gamesChannel = supabase.channel('public:games')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new.status === 'waiting') {
                    supabase.from('profiles').select('username, avatar_url').eq('id', payload.new.host_id).single().then(({ data }) => {
                        setGames(prev => {
                            const exists = prev.find(g => g.id === payload.new.id)
                            if (exists) return prev
                            return [{ ...payload.new, profiles: data, game_players: [] }, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        })
                    })
                } else if (payload.eventType === 'UPDATE') {
                    setGames(prev => prev.map(g => {
                        if (g.id !== payload.new.id) return g
                        const updated = { ...g, ...payload.new }
                        if (updated.status === 'playing') updated.isDummy = true
                        return updated
                    }).filter(g => g.status === 'waiting' || g.isDummy || g.status === 'playing'))
                } else if (payload.eventType === 'DELETE') {
                    setGames(prev => prev.filter(g => g.id !== payload.old.id))
                }
            })
            .subscribe()

        const playersChannel = supabase.channel('public:game_players')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, async (payload) => {
                const gameId = payload.eventType === 'DELETE' ? payload.old.game_id : payload.new.game_id
                const { data: currentPlayers } = await supabase
                    .from('game_players')
                    .select('*, profiles(username, avatar_url)')
                    .eq('game_id', gameId)
                if (currentPlayers) {
                    setGames(prev => prev.map(g => g.id === gameId ? { ...g, game_players: currentPlayers } : g))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(gamesChannel)
            supabase.removeChannel(playersChannel)
        }
    }, [supabase])

    const openInviteModal = useCallback(async (gameId: string, seatPosition: number) => {
        setInviteModal({ gameId, seatPosition })
        setInviteSent({})
        setLoadingFriends(true)
        const data = await getFriendsForInvite()
        setFriends(data)
        setLoadingFriends(false)
    }, [])

    const handleSendInvite = async (friendId: string) => {
        if (!inviteModal || sendingInvite) return
        setSendingInvite(friendId)
        const res = await sendTableInvite(inviteModal.gameId, friendId)
        setSendingInvite(null)
        if (res?.success) {
            setInviteSent(prev => ({ ...prev, [friendId]: true }))
        }
    }

    const filteredGames = games.filter(g => {
        if (!search) return true
        return g.profiles?.username?.toLowerCase().includes(search.toLowerCase())
    })

    const renderSeat = (game: any, playersList: any[], position: number) => {
        const p = playersList.find((pl: any) => pl.position === position)
        const isMyGame = game.host_id === currentUser?.id
        const isEmpty = !p

        if (p) {
            return (
                <div className="h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border border-primary/50 shadow-sm bg-primary text-white">
                    {p.profiles?.avatar_url
                        ? <img src={p.profiles.avatar_url} className="h-full w-full object-cover" alt="" />
                        : <span className="font-bold">{p.profiles?.username?.charAt(0) || 'P'}</span>
                    }
                </div>
            )
        }

        if (isEmpty && isMyGame && !game.isDummy) {
            return (
                <button
                    onClick={() => openInviteModal(game.id, position)}
                    className="h-10 w-10 rounded-full flex items-center justify-center border border-dashed border-accent/50 bg-accent/5 hover:bg-accent/20 hover:border-accent text-accent transition-all group"
                    title="Convidar amigo"
                >
                    <UserPlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                </button>
            )
        }

        return (
            <div className="h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border border-border/50 shadow-sm bg-muted">
                <span className="text-muted-foreground/30 text-lg">+</span>
            </div>
        )
    }

    return (
        <>
            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">Mesas Disponíveis</h2>
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Procurar mesa..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-9 w-64 rounded-full border border-gray-300 pl-9 pr-4 text-sm focus:border-accent focus:outline-none"
                        />
                    </div>
                </div>

                <div className="p-6">
                    {filteredGames.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border">
                            <span className="text-4xl mb-4">🪑</span>
                            <p>Não há mesas disponíveis no momento. Crie a primeira!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredGames.map((game: any) => {
                                const playerCount = game.isDummy ? 4 : (Array.isArray(game.game_players) && game.game_players[0] && game.game_players[0].count !== undefined) ? game.game_players[0].count : (game.game_players?.length || 0);
                                const playersList = Array.isArray(game.game_players) ? game.game_players : [];

                                return (
                                    <div key={game.id} className={`relative flex flex-col overflow-hidden rounded-xl border transition-all ${game.isDummy ? 'bg-muted/5 border-border/50 grayscale-[20%]' : 'bg-card border-border shadow-sm hover:shadow-md hover:border-accent/30'}`}>
                                        <div className="absolute inset-0 z-0">
                                            <Image src="/images/hero-banner.png" alt="" fill className="object-cover opacity-10 mix-blend-luminosity" />
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                                        </div>

                                        <div className="relative z-10 p-4 flex-1 space-y-3">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className={`font-bold text-lg line-clamp-1 ${(game.isDummy || game.status === 'playing') && game.host_id !== currentUser?.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                                        Mesa de {game.profiles?.username || "Anónimo"}
                                                    </h3>
                                                    <p className="text-sm font-medium text-muted-foreground mt-1">Aposta: <span className="font-bold text-success">€{game.stake.toFixed(2)}</span></p>
                                                </div>
                                                {game.isDummy ? (
                                                    <span className="flex items-center gap-1.5 text-danger font-bold text-xs bg-danger/10 px-2.5 py-1 rounded-full border border-danger/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                                                        Em Jogo
                                                    </span>
                                                ) : (
                                                    <span className="text-xs font-bold text-accent bg-accent/10 px-2.5 py-1 rounded-full border border-accent/20">
                                                        {playerCount}/4 Vagas
                                                    </span>
                                                )}
                                            </div>

                                            {/* Seats */}
                                            <div className="flex items-center justify-between gap-1 bg-primary/5 rounded-lg p-2 border border-primary/10 relative">
                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-inner z-0">
                                                    <span className="text-primary-foreground/50 font-serif font-bold text-xs">VS</span>
                                                </div>

                                                <div className="flex gap-1 z-10">
                                                    {renderSeat(game, playersList, 0)}
                                                    {renderSeat(game, playersList, 1)}
                                                </div>
                                                <div className="flex gap-1 z-10">
                                                    {renderSeat(game, playersList, 2)}
                                                    {renderSeat(game, playersList, 3)}
                                                </div>
                                            </div>

                                            {/* Invite hint for host */}
                                            {game.host_id === currentUser?.id && !game.isDummy && playerCount < 4 && (
                                                <p className="text-[10px] text-accent/70 flex items-center gap-1">
                                                    <UserPlus className="w-3 h-3" />
                                                    Clica nas cadeiras vazias para convidar amigos
                                                </p>
                                            )}
                                        </div>

                                        <div className="relative z-10 p-3 bg-card/80 backdrop-blur-sm border-t border-border mt-auto flex flex-col gap-2">
                                            {game.isDummy ? (
                                                <button disabled className="w-full rounded-lg bg-muted py-2 text-sm font-semibold text-muted-foreground border border-border cursor-not-allowed">
                                                    Mesa Preenchida
                                                </button>
                                            ) : game.host_id === currentUser?.id ? (
                                                <div className="flex flex-col gap-2">
                                                    <form action={onJoinGame}>
                                                        <input type="hidden" name="gameId" value={game.id} />
                                                        <SubmitButton className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 shadow-sm transition-all">
                                                            Entrar na Mesa
                                                        </SubmitButton>
                                                    </form>
                                                    <form action={onCancelGame}>
                                                        <input type="hidden" name="gameId" value={game.id} />
                                                        <SubmitButton className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/20 shadow-sm transition-all">
                                                            <Trash2 className="w-4 h-4" />
                                                            Cancelar Mesa
                                                        </SubmitButton>
                                                    </form>
                                                </div>
                                            ) : (
                                                <form action={onJoinGame} className="flex flex-col gap-2">
                                                    <input type="hidden" name="gameId" value={game.id} />
                                                    <select name="team" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent" defaultValue="">
                                                        <option value="" disabled>Escolha a Equipa (Opcional)</option>
                                                        <option value="A">Equipa A</option>
                                                        <option value="B">Equipa B</option>
                                                        <option value="">Qualquer Lugar</option>
                                                    </select>
                                                    <SubmitButton className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 shadow-sm transition-all">
                                                        Sentar na Mesa
                                                    </SubmitButton>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Invite Friend Modal */}
            {inviteModal && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4" onClick={() => setInviteModal(null)}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
                    <div
                        className="relative bg-card rounded-2xl shadow-2xl border border-border w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between p-4 border-b border-border bg-accent/5">
                            <div className="flex items-center gap-2">
                                <UserPlus className="w-5 h-5 text-accent" />
                                <h3 className="font-bold text-foreground">Convidar Amigo</h3>
                            </div>
                            <button onClick={() => setInviteModal(null)} className="text-muted-foreground hover:text-foreground p-1.5 rounded-full hover:bg-muted transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4 max-h-80 overflow-y-auto">
                            {loadingFriends ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : friends.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                    <p className="text-sm">Ainda não tens amigos adicionados.</p>
                                    <p className="text-xs mt-1">Vai ao Chat para adicionar amigos!</p>
                                </div>
                            ) : (
                                <ul className="space-y-2">
                                    {friends.map(friend => {
                                        const sent = inviteSent[friend.id]
                                        const sending = sendingInvite === friend.id
                                        return (
                                            <li key={friend.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors">
                                                <div className="w-9 h-9 rounded-full overflow-hidden bg-muted border border-border shrink-0">
                                                    {friend.avatar_url
                                                        ? <Image src={friend.avatar_url} alt={friend.username} width={36} height={36} className="object-cover w-full h-full" />
                                                        : <div className="w-full h-full flex items-center justify-center text-xs font-bold text-primary bg-primary/10">{friend.username.charAt(0).toUpperCase()}</div>
                                                    }
                                                </div>
                                                <span className="flex-1 font-medium text-sm text-foreground">{friend.username}</span>
                                                <button
                                                    onClick={() => handleSendInvite(friend.id)}
                                                    disabled={sent || sending}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                                        sent
                                                            ? 'bg-green-500/10 text-green-600 border border-green-500/20 cursor-default'
                                                            : 'bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm'
                                                    }`}
                                                >
                                                    {sending ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : sent ? (
                                                        <><Check className="w-3.5 h-3.5" /> Enviado</>
                                                    ) : (
                                                        <><UserPlus className="w-3.5 h-3.5" /> Convidar</>
                                                    )}
                                                </button>
                                            </li>
                                        )
                                    })}
                                </ul>
                            )}
                        </div>

                        <div className="px-4 pb-4">
                            <p className="text-[10px] text-muted-foreground text-center">
                                O amigo receberá uma notificação em tempo real se estiver online.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
