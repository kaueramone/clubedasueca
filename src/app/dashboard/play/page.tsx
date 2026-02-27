import { createClient } from "@/lib/supabase/server";
import { joinGame } from "./actions"; // Need to wrap joinGame in client component or form?
import { PlusCircle, Search } from "lucide-react";
import { CreateGameForm } from "./create-game-form";
import { SubmitButton } from "@/components/submit-button"; // Can reuse or create specific
import Link from "next/link"; // Changed from 'lucide-react' to 'next/link'

export const dynamic = 'force-dynamic';

export default async function LobbyPage() {
    const supabase = await createClient();
    const { data: games } = await supabase
        .from("games")
        .select("*, profiles:host_id(username, avatar_url), game_players(count)")
        .eq("status", "waiting")
        .order("created_at", { ascending: false });

    const dbGames = games?.filter((g) => {
        const players: any = g.game_players
        return (players[0]?.count || 0) < 4
    }) || [];

    // Tática de Growth Hacking: Simular mesas sempre cheias/em jogo para criar perceção de movimento
    const dummyGames = [
        {
            id: 'dummy-1',
            profiles: { username: 'RuiCosta89', avatar_url: null },
            game_players: [{ count: 4 }],
            stake: 5.0,
            status: 'playing',
            isDummy: true
        },
        {
            id: 'dummy-2',
            profiles: { username: 'Maria_PT', avatar_url: null },
            game_players: [{ count: 4 }],
            stake: 2.5,
            status: 'playing',
            isDummy: true
        }
    ];

    const availableGames = [...dummyGames, ...dbGames];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Mesa de Jogo</h1>

                <CreateGameForm />
            </div>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b bg-gray-50 px-6 py-4 flex items-center justify-between">
                    <h2 className="font-semibold text-gray-700">Mesas Disponíveis</h2>
                    <div className="relative hidden sm:block">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                        <input type="text" placeholder="Procurar mesa..." className="h-9 w-64 rounded-full border border-gray-300 pl-9 pr-4 text-sm focus:border-accent focus:outline-none" />
                    </div>
                </div>

                <div className="p-6">
                    {availableGames.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-center text-muted-foreground bg-muted/10 rounded-2xl border border-dashed border-border">
                            <span className="text-4xl mb-4">🪑</span>
                            <p>Não há mesas disponíveis no momento. Crie a primeira!</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {availableGames.map((game: any) => {
                                const playerCount = game.isDummy ? 4 : game.game_players[0]?.count || 0;

                                return (
                                    <div key={game.id} className={`flex flex-col overflow-hidden rounded-2xl border transition-all ${game.isDummy ? 'bg-muted/5 border-border/50 grayscale-[20%]' : 'bg-card border-border shadow-sm hover:shadow-md hover:border-accent/30'}`}>
                                        <div className="p-5 flex-1 space-y-4">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <h3 className="font-bold text-lg text-foreground line-clamp-1">Mesa de {game.profiles?.username || "Anónimo"}</h3>
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

                                            {/* 2x2 Avatar Grid representing the Table Seats */}
                                            <div className="grid grid-cols-2 gap-2 aspect-square relative bg-primary/5 rounded-xl p-3 border border-primary/10">
                                                {/* Center Table Decoration */}
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="w-16 h-16 rounded-full bg-primary border-4 border-primary-foreground/20 flex items-center justify-center shadow-inner">
                                                        <span className="text-primary-foreground/50 font-serif font-bold text-xl">♣</span>
                                                    </div>
                                                </div>

                                                {/* Seat 1 (Host/Player) */}
                                                <div className="flex items-center justify-center">
                                                    <div className="h-14 w-14 rounded-full bg-background flex items-center justify-center overflow-hidden border-2 border-primary/20 shadow-sm z-10">
                                                        {game.profiles?.avatar_url ? <img src={game.profiles.avatar_url} className="h-full w-full object-cover" /> : <span className="font-bold text-primary">{game.profiles?.username?.charAt(0) || 'A'}</span>}
                                                    </div>
                                                </div>

                                                {/* Seat 2 */}
                                                <div className="flex items-center justify-center">
                                                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border/50 shadow-sm z-10">
                                                        {playerCount > 1 ? <span className="text-muted-foreground">👤</span> : <span className="text-muted-foreground/30 text-xl">+</span>}
                                                    </div>
                                                </div>

                                                {/* Seat 3 */}
                                                <div className="flex items-center justify-center">
                                                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border/50 shadow-sm z-10">
                                                        {playerCount > 2 ? <span className="text-muted-foreground">👤</span> : <span className="text-muted-foreground/30 text-xl">+</span>}
                                                    </div>
                                                </div>

                                                {/* Seat 4 */}
                                                <div className="flex items-center justify-center">
                                                    <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border/50 shadow-sm z-10">
                                                        {playerCount > 3 ? <span className="text-muted-foreground">👤</span> : <span className="text-muted-foreground/30 text-xl">+</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-muted/30 border-t border-border mt-auto">
                                            {game.isDummy ? (
                                                <button disabled className="w-full rounded-xl bg-muted py-3 text-sm font-semibold text-muted-foreground border border-border cursor-not-allowed">
                                                    Mesa Preenchida
                                                </button>
                                            ) : (
                                                <form action={async () => {
                                                    "use server"
                                                    await joinGame(game.id)
                                                }}>
                                                    <SubmitButton className="w-full rounded-xl bg-accent py-3 text-sm font-semibold text-accent-foreground hover:bg-accent/90 shadow-sm transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
                                                        Sentar na Mesa
                                                    </SubmitButton>
                                                </form>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
