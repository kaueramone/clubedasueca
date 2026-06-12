
import { createClient } from "@/lib/supabase/server";
import { GameTable } from "@/features/game/game-table";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    // Estado do jogo (a linha de games é legível por participantes/host/lobby via RLS)
    const { data: game, error } = await supabase
        .from("games")
        .select("*")
        .eq("id", gameId)
        .single();

    if (error || !game) {
        console.error("Game fetch error:", error);
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <h2 className="text-2xl font-bold">Jogo não encontrado</h2>
                <p className="text-muted-foreground mt-2">UUID: {gameId}</p>
                {error && <p className="text-danger mt-4 text-sm">{error.message}</p>}
            </div>
        );
    }

    // Jogadores via get_table_state: devolve a mão SÓ do próprio utilizador
    // (+ hand_count dos restantes). Esconde as cartas dos adversários (migração 103).
    const { data: tableState } = await supabase.rpc("get_table_state", { p_game_id: gameId });
    const players: any[] = (tableState as any)?.players ?? [];

    // Check if user is player
    const isPlayer = players.some((p: any) => p.user_id === user.id);
    // If not player, redirect to lobby (UNLESS they are host, which they should be in players anyway)
    if (!isPlayer && game.host_id !== user.id) {
        redirect("/dashboard/play");
    }

    const gameWithPlayers = { ...game, game_players: players };

    return (
        <div className="h-[calc(100dvh-4rem)] -m-4 md:-m-8 overflow-hidden bg-ios-gray6">
            <GameTable game={gameWithPlayers} currentUser={user} />
        </div>
    );
}
