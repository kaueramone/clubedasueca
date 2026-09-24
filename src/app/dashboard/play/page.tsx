import { createClient } from "@/lib/supabase/server";
import { joinGame } from "./actions"; // Need to wrap joinGame in client component or form?
import { cancelGame } from "@/features/game/actions";
import { PlusCircle, Search, User, Trash2 } from "lucide-react";
import { CreateGameForm } from "./create-game-form";
import { LobbyGrid } from "@/features/game/components/lobby-grid";
import Link from "next/link"; // Changed from 'lucide-react' to 'next/link'
import Image from "next/image";

export const dynamic = 'force-dynamic';

export default async function LobbyPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();


    const { data: games } = await supabase
        .from("games")
        .select("*, game_players(count)")
        .eq("status", "waiting")
        .order("created_at", { ascending: false });

    const dbGames = games?.filter((g) => {
        const players: any = g.game_players
        return (players[0]?.count || 0) < 4
    }) || [];

    const hostIds = [...new Set(dbGames.map(g => g.host_id))];
    const { data: profiles } = hostIds.length ? await supabase.from('public_profiles').select('id, username, avatar_url').in('id', hostIds) : { data: [] };
    const availableGames = dbGames.map(game => ({ ...game, profiles: profiles?.find(p => p.id === game.host_id) }));

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-white sm:text-gray-900">Mesa de Jogo</h1>

                <CreateGameForm />
            </div>

            <LobbyGrid
                initialGames={availableGames}
                currentUser={user}
                onJoinGame={async (formData: FormData) => {
                    "use server"
                    const gId = formData.get('gameId') as string
                    await joinGame(gId, formData)
                }}
                onCancelGame={async (formData: FormData) => {
                    "use server"
                    const gId = formData.get('gameId') as string
                    await cancelGame(gId)
                }}
            />
        </div>
    );
}
