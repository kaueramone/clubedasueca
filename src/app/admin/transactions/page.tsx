"use client";

import { useEffect, useState } from "react";
import { getTransactions } from "../actions";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function AdminTransactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const t = await getTransactions(page);
        setTransactions(t || []);
        setError("");
      } catch {
        setError("Não foi possível carregar as transações.");
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [page]);

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-foreground">
            Transações
          </h1>
          <p className="text-muted-foreground mt-1">
            Movimentos de créditos fictícios do beta. Nenhum registo comprova um
            pagamento real.
          </p>
        </div>
      </div>

      {error && <p role="alert">{error}</p>}
      <div className="flex gap-4">
        <button
          disabled={page === 1 || loading}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>
        <span>Página {page}</span>
        <button
          disabled={transactions.length < 50 || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Seguinte
        </button>
      </div>
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground animate-pulse">
            A analisar fluxo de capital...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-muted-foreground">
              <thead className="bg-muted/50 text-foreground font-medium border-b border-border">
                <tr>
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">Utilizador</th>
                  <th className="px-6 py-4">Tipo</th>
                  <th className="px-6 py-4">Quantia</th>
                  <th className="px-6 py-4">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {transactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-6 py-4">
                      {new Date(tx.created_at).toLocaleString("pt-PT")}
                    </td>
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {tx.wallet?.user?.username || "Sistema"}
                    </td>
                    <td className="px-6 py-4">
                      <Badge
                        variant="outline"
                        className={
                          tx.type === "deposit"
                            ? "border-success text-success bg-success/10"
                            : ["withdraw", "withdrawal"].includes(tx.type)
                              ? "border-danger text-danger bg-danger/10"
                              : "border-primary text-primary bg-primary/10"
                        }
                      >
                        {tx.type === "deposit"
                          ? "Créditos de teste"
                          : ["withdraw", "withdrawal"].includes(tx.type)
                            ? "Pedido histórico de levantamento"
                            : tx.type}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 flex items-center gap-1 font-bold">
                      {tx.amount > 0 ? (
                        <ArrowUpRight className="h-4 w-4 text-success" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-danger" />
                      )}
                      <span
                        className={
                          tx.amount > 0 ? "text-success" : "text-danger"
                        }
                      >
                        {Math.abs(tx.amount).toFixed(2)} créditos
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">{tx.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
