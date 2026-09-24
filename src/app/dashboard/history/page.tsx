import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
export const dynamic = "force-dynamic";
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const params = await searchParams;
  const value = Number(params.page || 1);
  const page =
    Number.isSafeInteger(value) && value > 0 ? Math.min(value, 100000) : 1;
  const from = (page - 1) * 20;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  const transactions = wallet
    ? await supabase
        .from("transactions")
        .select("*", { count: "exact" })
        .eq("wallet_id", wallet.id)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, from + 19)
    : { data: [], count: 0, error: walletError };
  const games = await supabase
    .from("game_players")
    .select(
      "game_id, team, games!inner(id, status, created_at, score_a, score_b, winner_team)",
      { count: "exact" },
    )
    .eq("user_id", user.id)
    .eq("games.status", "finished")
    .order("created_at", { referencedTable: "games", ascending: false })
    .order("game_id")
    .range(from, from + 19);
  const totalPages = Math.max(
    1,
    Math.ceil(Math.max(transactions.count || 0, games.count || 0) / 20),
  );
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Histórico de atividade</h1>
      <p>
        Movimentos do beta em créditos fictícios, sem valor monetário. Nenhum
        movimento representa um pagamento real.
      </p>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Movimentos de créditos</h2>
        {transactions.error ? (
          <p role="alert">Não foi possível carregar os movimentos.</p>
        ) : !transactions.data?.length ? (
          <p>Sem movimentos nesta página.</p>
        ) : (
          transactions.data.map((tx) => (
            <article
              key={tx.id}
              className="bg-card border border-border rounded p-4"
            >
              <p>{tx.description || tx.type}</p>
              <p className="text-sm text-muted-foreground">
                {new Date(tx.created_at).toLocaleString("pt-MZ", {
                  timeZone: "Africa/Maputo",
                })}{" "}
                · {tx.status || "Registado"}
              </p>
              <strong>{Number(tx.amount).toFixed(2)} créditos</strong>
            </article>
          ))
        )}
      </section>
      <section className="space-y-3">
        <h2 className="text-xl font-bold">Partidas terminadas</h2>
        {games.error ? (
          <p role="alert">Não foi possível carregar as partidas.</p>
        ) : !games.data?.length ? (
          <p>Sem partidas nesta página.</p>
        ) : (
          games.data.map((entry) => {
            const game = Array.isArray(entry.games)
              ? entry.games[0]
              : entry.games;
            if (!game) return null;
            const result =
              game.winner_team === "Draw" ||
              Number(game.score_a) === Number(game.score_b)
                ? "Empate"
                : game.winner_team === entry.team
                  ? "Vitória"
                  : "Derrota";
            return (
              <article
                key={entry.game_id}
                className="bg-card border border-border rounded p-4"
              >
                <p>
                  {result} · A {game.score_a} — {game.score_b} B · A sua equipa:{" "}
                  {entry.team}
                </p>
                <p className="text-sm break-all">
                  Mesa {game.id} ·{" "}
                  {new Date(game.created_at).toLocaleString("pt-MZ", {
                    timeZone: "Africa/Maputo",
                  })}
                </p>
              </article>
            );
          })
        )}
      </section>
      <nav aria-label="Paginação do histórico" className="flex gap-4">
        {page > 1 && <Link href={`?page=${page - 1}`}>Anterior</Link>}
        <span>
          Página {page} de {totalPages}
        </span>
        {page < totalPages && <Link href={`?page=${page + 1}`}>Seguinte</Link>}
      </nav>
    </div>
  );
}
