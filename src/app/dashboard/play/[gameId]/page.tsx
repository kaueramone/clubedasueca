import Link from 'next/link';
import { tableFromSnapshot } from '@/features/game/table-state';

import { createClient } from "@/lib/supabase/server";
import { GameTable } from "@/features/game/game-table";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function GamePage({ params }: { params: Promise<{ gameId: string }> }) {
    const { gameId } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data, error } = await supabase.rpc("get_table_state", { p_game_id: gameId });
    if (error || !data) return <div className="p-8 text-center">Não foi possível carregar a mesa. <Link href="/dashboard/play" className="underline">Voltar às mesas</Link></div>;
    const snapshot = data as unknown as Parameters<typeof tableFromSnapshot>[0];
    const game = tableFromSnapshot(snapshot);
    if (!game.game_players.some(p => p.user_id === user.id)) redirect("/dashboard/play");
    return <div className="fixed inset-0 z-50 h-dvh overflow-hidden bg-ios-gray6"><GameTable game={game} currentUser={user} /></div>;
}
