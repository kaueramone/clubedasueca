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
