
import { createClient } from "@/lib/supabase/server";
import { GameTable } from "@/features/game/game-table";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function GamePage({ params }: { params: { gameId: string } }) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: game } = await supabase
        .from("games")
        .select("*, game_players(*, profiles(username, avatar_url))")
        .eq("id", params.gameId)
        .single();

    if (!game) return <div>Jogo não encontrado</div>;

    // Check if user is player
    const isPlayer = game.game_players.some((p: any) => p.user_id === user.id);
    // If not player, maybe redirect to lobby or allow spectator (future)
    if (!isPlayer) redirect("/dashboard/play");

    return (
        <div className="h-[calc(100vh-6rem)] w-full overflow-hidden bg-ios-gray6">
            <GameTable game={game} currentUser={user} />
        </div>
    );
}
