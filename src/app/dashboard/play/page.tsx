import { createClient } from "@/lib/supabase/server";
import { joinGame } from "./actions"; // Need to wrap joinGame in client component or form?
import { cancelGame } from "@/features/game/actions";
import { PlusCircle, Search, User, Trash2 } from "lucide-react";
import { CreateGameForm } from "./create-game-form";
import { SubmitButton } from "@/components/submit-button"; // Can reuse or create specific
import Link from "next/link"; // Changed from 'lucide-react' to 'next/link'
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function LobbyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: games } = await supabase
        .from("games")
        .select("*, profiles:host_id(username, avatar_url), game_players(count)")
        .eq("status", "waiting")
        .order("created_at", { ascending: false });

    const dbGames = games?.filter((g) => {
        const players: any = g.game_players
        return (players[0]?.count || 0) < 4
    }) || [];

    // Tó¡tica de Growth Hacking: Simular mesas sempre cheias/em jogo para criar perceó§ó£o de movimento
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
                <h1 className="text-2xl font-bold text-white sm:text-gray-900">Mesa de Jogo</h1>

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
                                    <div key={game.id} className={`relative flex flex-col overflow-hidden rounded-xl border transition-all ${game.isDummy ? 'bg-muted/5 border-border/50 grayscale-[20%]' : 'bg-card border-border shadow-sm hover:shadow-md hover:border-accent/30'}`}>
                                        <div className="absolute inset-0 z-0">
                                            <Image src="/images/hero-banner.png" alt="Card Background" fill className="object-cover opacity-10 mix-blend-luminosity" />
                                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" />
                                        </div>

                                        <div className="relative z-10 p-4 flex-1 space-y-3">
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

                                            {/* Avatar Row representing the Table Seats */}
                                            <div className="flex items-center justify-between gap-1 bg-primary/5 rounded-lg p-2 border border-primary/10 relative">
                                                {/* Center Table Decoration */}
                                                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-inner z-0">
                                                    <span className="text-primary-foreground/50 font-serif font-bold text-xs">VS</span>
                                                </div>

                                                <div className="flex gap-1 z-10">
                                                    {/* Seat 1 (Host/Player) */}
                                                    <div className="h-10 w-10 text-xs rounded-full bg-primary flex items-center justify-center overflow-hidden border border-primary/50 shadow-sm text-white">
                                                        {game.profiles?.avatar_url ? <img src={game.profiles.avatar_url} className="h-full w-full object-cover" /> : <span className="font-bold text-white">{game.profiles?.username?.charAt(0) || 'A'}</span>}
                                                    </div>

                                                    {/* Seat 2 */}
                                                    <div className={`h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border shadow-sm ${playerCount > 1 ? 'bg-primary border-primary/50' : 'bg-muted border-border/50'}`}>
                                                        {playerCount > 1 ? <User className="h-5 w-5 text-white" /> : <span className="text-muted-foreground/30">+</span>}
                                                    </div>
                                                </div>

                                                <div className="flex gap-1 z-10">
                                                    {/* Seat 3 */}
                                                    <div className={`h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border shadow-sm ${playerCount > 2 ? 'bg-primary border-primary/50' : 'bg-muted border-border/50'}`}>
                                                        {playerCount > 2 ? <User className="h-5 w-5 text-white" /> : <span className="text-muted-foreground/30">+</span>}
                                                    </div>

                                                    {/* Seat 4 */}
                                                    <div className={`h-10 w-10 text-xs rounded-full flex items-center justify-center overflow-hidden border shadow-sm ${playerCount > 3 ? 'bg-primary border-primary/50' : 'bg-muted border-border/50'}`}>
                                                        {playerCount > 3 ? <User className="h-5 w-5 text-white" /> : <span className="text-muted-foreground/30">+</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="relative z-10 p-3 bg-card/80 backdrop-blur-sm border-t border-border mt-auto">
                                            {game.isDummy ? (
                                                <button disabled className="w-full rounded-lg bg-muted py-2 text-sm font-semibold text-muted-foreground border border-border cursor-not-allowed">
                                                    Mesa Preenchida
                                                </button>
                                            ) : game.host_id === user?.id ? (
                                                <form action={async () => {
                                                    "use server"
                                                    await cancelGame(game.id)
                                                }}>
                                                    <SubmitButton className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 py-2 text-sm font-semibold text-red-600 hover:bg-red-500/20 shadow-sm transition-all">
                                                        <Trash2 className="w-4 h-4" />
                                                        Cancelar Mesa
                                                    </SubmitButton>
                                                </form>
                                            ) : (
                                                <form action={async () => {
                                                    "use server"
                                                    await joinGame(game.id)
                                                }}>
                                                    <SubmitButton className="w-full rounded-lg bg-accent py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 shadow-sm transition-all focus:ring-2 focus:ring-accent focus:ring-offset-2">
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
