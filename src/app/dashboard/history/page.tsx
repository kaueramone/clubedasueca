import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: transactions } = await supabase
        .from("transactions")
        .select("*")
        .eq("wallet_id", (
            await supabase.from("wallets").select("id").eq("user_id", user.id).single()
        ).data?.id)
        .order("created_at", { ascending: false });

    // TODO: Fetch games history too

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-white">Histórico de Atividade</h1>

            <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
                <div className="border-b border-border bg-muted/50 px-6 py-4">
                    <h2 className="font-semibold text-foreground">Transações Financeiras</h2>
                </div>
                <div className="divide-y divide-border">
                    {transactions?.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            Sem transações registadas.
                        </div>
                    ) : (
                        transactions?.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted/50 transition-colors">
                                <div>
                                    <p className="font-medium text-foreground">{tx.description}</p>
                                    <p className="text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</p>
                                </div>
                                <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-success' : 'text-danger'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
