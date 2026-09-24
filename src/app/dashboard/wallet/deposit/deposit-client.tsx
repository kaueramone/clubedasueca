"use client";
import { useState } from "react";
import { deposit } from "../actions";
import Link from "next/link";
import { useRouter } from "next/navigation";
export function DepositPageClient() {
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("amount", amount);
      const result = await deposit(form);
      setMessage(
        result.error || "Créditos de teste adicionados. Não houve cobrança.",
      );
      if (!result.error) router.refresh();
    } catch {
      setMessage(
        "Não foi possível confirmar a operação. Consulte o histórico antes de tentar novamente.",
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <section className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 space-y-6">
      <h1 className="text-2xl font-bold">Adicionar créditos de teste</h1>
      <p>
        Sem cobrança. Os créditos não têm valor monetário, não podem ser
        levantados e serão repostos a zero no lançamento oficial.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <label htmlFor="amount" className="block">
          Quantidade de créditos
        </label>
        <input
          id="amount"
          type="number"
          min="50"
          max="10000"
          step="1"
          required
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded border border-border bg-background p-3"
        />
        <p className="text-sm text-muted-foreground">
          Entre 50 e 10 000 por operação. Limite da carteira: 100 000 créditos
          de teste.
        </p>
        <button
          disabled={loading}
          className="w-full rounded bg-accent p-3 font-bold disabled:opacity-50"
        >
          {loading ? "A adicionar…" : "Adicionar gratuitamente"}
        </button>
      </form>
      {message && <p role="status">{message}</p>}
      <Link href="/dashboard/wallet" className="underline">
        Voltar à carteira
      </Link>
    </section>
  );
}
