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
            <h1 className="text-2xl font-bold text-gray-900">Histó³rico de Atividade</h1>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
                <div className="border-b bg-gray-50 px-6 py-4">
                    <h2 className="font-semibold text-gray-700">Transaó§óµes Financeiras</h2>
                </div>
                <div className="divide-y">
                    {transactions?.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            Sem transaó§óµes registadas.
                        </div>
                    ) : (
                        transactions?.map((tx) => (
                            <div key={tx.id} className="flex items-center justify-between px-6 py-4 hover:bg-gray-50">
                                <div>
                                    <p className="font-medium text-gray-900">{tx.description}</p>
                                    <p className="text-sm text-gray-500">{new Date(tx.created_at).toLocaleString()}</p>
                                </div>
                                <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-ios-green' : 'text-gray-900'}`}>
                                    {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)}€‚¬
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
