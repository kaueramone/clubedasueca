'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { Search, User, Trash2, PlusCircle } from 'lucide-react'
import { SubmitButton } from '@/components/submit-button'

export function LobbyGrid({ initialGames, currentUser, onJoinGame, onCancelGame }: { initialGames: any[], currentUser: any, onJoinGame: any, onCancelGame: any }) {
    const [games, setGames] = useState<any[]>(initialGames)
    const [search, setSearch] = useState('')
    const supabase = createClient()

    useEffect(() => {
        setGames(initialGames)
    }, [initialGames])

    useEffect(() => {
        // Subscribe to games changes
        const gamesChannel = supabase.channel('public:games')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, (payload) => {
                if (payload.eventType === 'INSERT' && payload.new.status === 'waiting') {
                    // Fetch profile for new game
                    supabase.from('profiles').select('username, avatar_url').eq('user_id', payload.new.host_id).single().then(({ data }) => {
                        setGames(prev => {
                            const exists = prev.find(g => g.id === payload.new.id)
                            if (exists) return prev
                            return [{ ...payload.new, profiles: data, game_players: [] }, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        })
                    })
                } else if (payload.eventType === 'UPDATE') {
                    setGames(prev => prev.map(g => g.id === payload.new.id ? { ...g, ...payload.new } : g).filter(g => g.status === 'waiting' || g.isDummy))
                } else if (payload.eventType === 'DELETE') {
                    setGames(prev => prev.filter(g => g.id === payload.old.id ? false : true))
                }
            })
            .subscribe()

        // Subscribe to game_players changes to update counts and photos
        const playersChannel = supabase.channel('public:game_players')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'game_players' }, async (payload) => {
                const gameId = payload.eventType === 'DELETE' ? payload.old.game_id : payload.new.game_id

                // Fetch full players to update UI
                const { data: currentPlayers } = await supabase
                    .from('game_players')
                    .select('*, profiles(username, avatar_url)')
                    .eq('game_id', gameId)

                if (currentPlayers) {
                    setGames(prev => prev.map(g => {
                        if (g.id === gameId) {
                            return { ...g, game_players: currentPlayers }
                        }
                        return g
                    }))
                }
            })
            .subscribe()

        return () => {
            supabase.removeChannel(gamesChannel)
            supabase.removeChannel(playersChannel)
        }
    }, [supabase])

    const filteredGames = games.filter(g => {
        if (!search) return true
        return g.profiles?.username?.toLowerCase().includes(search.toLowerCase())
    })

    return (
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
                                        <Image src="/images/hero-banner.png" alt="Card Background" fill className="object-cover opacity-10 mix-blend-luminosity" />
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

                                        {/* Avatar Row representing the Table Seats */}
                                        <div className="flex items-center justify-between gap-1 bg-primary/5 rounded-lg p-2 border border-primary/10 relative">
                                            {/* Center Table Decoration */}
                                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-inner z-0">
                                                <span className="text-primary-foreground/50 font-serif font-bold text-xs">VS</span>
                                            </div>

                                            <div className="flex gap-1 z-10">
                                                {/* Seat 1 */}
                                                <div className="h-10 w-10 text-xs rounded-full bg-primary flex items-center justify-center overflow-hidden border border-primary/50 shadow-sm text-white">
                                                    {playersList?.find((p: any) => p.position === 0)?.profiles?.avatar_url ? (
                                                        <img src={playersList.find((p: any) => p.position === 0).profiles.avatar_url} className="h-full w-full object-cover" />
                                                    ) : (
                                                        <span className="font-bold text-white">{playersList?.find((p: any) => p.position === 0)?.profiles?.username?.charAt(0) || game.profiles?.username?.charAt(0) || 'D'}</span>
                                                    )}
                                                </div>

                                                {/* Seat 2 */}
                                                {(() => {
                                                    const p = playersList?.find((pl: any) => pl.position === 1);
                                                    return (
                                                        <div className={`h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border shadow-sm ${p ? 'bg-primary border-primary/50 text-white' : 'bg-muted border-border/50'}`}>
                                                            {p ? (p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} className="h-full w-full object-cover" /> : <span className="font-bold text-white">{p.profiles?.username?.charAt(0) || 'P'}</span>) : <span className="text-muted-foreground/30">+</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </div>

                                            <div className="flex gap-1 z-10">
                                                {/* Seat 3 */}
                                                {(() => {
                                                    const p = playersList?.find((pl: any) => pl.position === 2);
                                                    return (
                                                        <div className={`h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border shadow-sm ${p ? 'bg-primary border-primary/50 text-white' : 'bg-muted border-border/50'}`}>
                                                            {p ? (p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} className="h-full w-full object-cover" /> : <span className="font-bold text-white">{p.profiles?.username?.charAt(0) || 'P'}</span>) : <span className="text-muted-foreground/30">+</span>}
                                                        </div>
                                                    );
                                                })()}

                                                {/* Seat 4 */}
                                                {(() => {
                                                    const p = playersList?.find((pl: any) => pl.position === 3);
                                                    return (
                                                        <div className={`h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border shadow-sm ${p ? 'bg-primary border-primary/50 text-white' : 'bg-muted border-border/50'}`}>
                                                            {p ? (p.profiles?.avatar_url ? <img src={p.profiles.avatar_url} className="h-full w-full object-cover" /> : <span className="font-bold text-white">{p.profiles?.username?.charAt(0) || 'P'}</span>) : <span className="text-muted-foreground/30">+</span>}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        </div>
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
                                                    <SubmitButton className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 shadow-sm transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
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
                                                <select
                                                    name="team"
                                                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Escolha a Equipa (Opcional)</option>
                                                    <option value="A">Equipa A</option>
                                                    <option value="B">Equipa B</option>
                                                    <option value="">Qualquer Lugar</option>
                                                </select>
                                                <SubmitButton className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 shadow-sm transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
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
    )
}
