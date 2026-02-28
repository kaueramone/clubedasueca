
import { createClient } from "@/lib/supabase/server";
import { GameTable } from "@/features/game/game-table";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function GamePage({ params }: { params: { gameId: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: game, error } = await supabase
        .from("games")
        .select("*, game_players(*, profiles(username, avatar_url))")
        .eq("id", params.gameId)
        .single();

    if (error || !game) {
        console.error("Game fetch error:", error);
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold">Jogo não encontrado</h2>
                <p className="text-muted-foreground mt-2">UUID: {params.gameId}</p>
                {error && <p className="text-danger mt-4 text-sm">{error.message}</p>}
            </div>
        );
    }

    // Check if user is player
    const isPlayer = game.game_players.some((p: any) => p.user_id === user.id);
    // If not player, redirect to lobby (UNLESS they are host, which they should be in players anyway)
    if (!isPlayer && game.host_id !== user.id) {
        redirect("/dashboard/play");
    }

    return (
        <div className="h-[calc(100vh-6rem)] w-full overflow-hidden bg-ios-gray6">
            <GameTable game={game} currentUser={user} />
        </div>
    );
}
