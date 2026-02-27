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

    // Filter out full games or handle in UI
    const availableGames = games?.filter((g) => {
        const players: any = g.game_players
        return (players[0]?.count || 0) < 4
    }) || [];

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

                <div className="divide-y max-h-[600px] overflow-y-auto">
                    {availableGames.length === 0 ? (
                        <div className="py-12 text-center text-gray-500">
                            Não há mesas disponíveis no momento. Crie uma!
                        </div>
                    ) : (
                        availableGames.map((game) => (
                            <div key={game.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-ios-gray4 overflow-hidden">
                                        {game.profiles?.avatar_url && <img src={game.profiles.avatar_url} className="h-full w-full object-cover" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900">Mesa de {game.profiles?.username || "Anónimo"}</h3>
                                        <p className="text-sm text-gray-500">{game.game_players[0].count}/4 Jogadores • Aposta: <span className="font-bold text-ios-green">€{game.stake}</span></p>
                                    </div>
                                </div>
                                <form action={async () => {
                                    "use server"
                                    await joinGame(game.id)
                                }}>
                                    <SubmitButton className="rounded-xl bg-ios-green px-6 py-2 text-sm font-semibold text-white hover:bg-ios-green/90 shadow-sm">
                                        Entrar
                                    </SubmitButton>
                                </form>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
