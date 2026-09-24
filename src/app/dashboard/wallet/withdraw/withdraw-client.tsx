import Link from "next/link";
export function WithdrawPageClient() {
  return (
    <section className="max-w-lg mx-auto bg-card border border-border rounded-2xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">
        Levantamentos indisponíveis no beta
      </h1>
      <p>
        Os créditos são fictícios, não têm valor monetário e não podem ser
        convertidos em dinheiro. Não há pedidos de pagamento nesta fase.
      </p>
      <p>
        Todos os saldos serão repostos a zero no lançamento oficial. Os meios de
        pagamento só serão anunciados após a aprovação da licença e a
        contratação de um prestador.
      </p>
      <Link href="/dashboard/wallet" className="underline">
        Voltar à carteira
      </Link>
    </section>
  );
}
