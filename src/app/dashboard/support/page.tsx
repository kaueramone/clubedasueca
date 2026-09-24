"use client";
import { useEffect, useState } from "react";
import {
  startConversation,
  getUserConversations,
  getChatMessages,
  sendChatMessage,
} from "@/features/chat/actions";

type Ticket = {
  id: string;
  subject: string;
  status: string;
  agent?: { username: string } | null;
};
type Message = {
  id: string;
  message: string;
  is_bot: boolean;
  sender?: { username: string } | null;
};
const statusLabel: Record<string, string> = {
  waiting_agent: "Na fila da equipa",
  open: "Aberto",
  active: "Em atendimento",
  resolved: "Resolvido",
  closed: "Fechado",
};
export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [active, setActive] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function refresh() {
    const r = await getUserConversations();
    if (r.error) throw new Error(r.error);
    setTickets(r.conversations || []);
  }
  useEffect(() => {
    refresh().catch(() => setNotice("Não foi possível carregar os pedidos."));
  }, []);
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const load = async () => {
      try {
        const r = await getChatMessages(active);
        if (!cancelled) {
          if (r.error) setNotice(r.error);
          else setMessages(r.messages || []);
        }
      } catch {
        if (!cancelled) setNotice("Não foi possível atualizar as mensagens.");
      }
    };
    load();
    const timer = setInterval(() => {
      load();
      refresh().catch(() => {});
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [active]);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setNotice("");
    try {
      const result = await startConversation(
        String(data.get("subject")),
        String(data.get("message")),
      );
      if (result.error) setNotice(result.error);
      else {
        setNotice(
          "Pedido registado: " +
            result.conversationId +
            ". Acompanhe a resposta abaixo.",
        );
        setActive(result.conversationId || "");
        form.reset();
        await refresh();
      }
    } catch {
      setNotice(
        "Não foi possível confirmar o pedido. Atualize a lista antes de tentar novamente.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function reply(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const r = await sendChatMessage(active, String(data.get("reply")));
      if (r.error) setNotice(r.error);
      else {
        form.reset();
        const m = await getChatMessages(active);
        setMessages(m.messages || []);
        await refresh();
        setNotice("Mensagem registada.");
      }
    } catch {
      setNotice(
        "Não foi possível confirmar o envio. Consulte as mensagens antes de repetir.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Suporte</h1>
      <p>
        Abra um pedido e acompanhe a resposta aqui. Durante o beta, o
        atendimento não tem horário ou prazo garantido. Não envie PIN nem dados
        financeiros.
      </p>
      {notice && (
        <p role="status" className="rounded border border-accent p-3">
          {notice}
        </p>
      )}
      <form
        onSubmit={submit}
        className="space-y-3 rounded-xl bg-card border border-border p-5"
      >
        <label htmlFor="subject">Assunto</label>
        <input
          id="subject"
          name="subject"
          required
          maxLength={150}
          className="block w-full bg-background border border-border rounded p-3"
        />
        <label htmlFor="message">Mensagem</label>
        <textarea
          id="message"
          name="message"
          required
          maxLength={4000}
          className="block w-full bg-background border border-border rounded p-3"
        />
        <button
          disabled={busy}
          className="bg-accent rounded p-3 disabled:opacity-50"
        >
          {busy ? "A enviar…" : "Abrir pedido"}
        </button>
      </form>
      <h2 className="text-xl font-bold">Os meus pedidos</h2>
      <button
        onClick={() =>
          refresh().catch(() => setNotice("Não foi possível atualizar."))
        }
        className="underline"
      >
        Atualizar lista
      </button>
      {!tickets.length && <p>Sem pedidos carregados.</p>}
      {tickets.map((t) => (
        <button
          key={t.id}
          onClick={() => {
            setMessages([]);
            setActive(t.id);
          }}
          className="block text-left w-full border border-border rounded p-3"
        >
          <strong>{t.subject}</strong>
          <br />
          <span className="text-sm break-all">
            {t.id} · {statusLabel[t.status] || t.status} · Responsável:{" "}
            {t.agent?.username || "A atribuir"}
          </span>
        </button>
      ))}
      {active && (
        <section className="space-y-3">
          <h2 className="font-bold break-all">Pedido {active}</h2>
          {messages.map((m) => (
            <div
              key={m.id}
              className="bg-card rounded border border-border p-3"
            >
              <p className="text-xs text-muted-foreground">
                {m.is_bot
                  ? "Resposta automática"
                  : m.sender?.username || "Participante"}
              </p>
              <p className="whitespace-pre-wrap break-words">{m.message}</p>
            </div>
          ))}
          <form onSubmit={reply} className="space-y-3">
            <label htmlFor="reply">
              Nova mensagem / pedir atendimento humano
            </label>
            <textarea
              id="reply"
              name="reply"
              required
              maxLength={4000}
              className="w-full rounded bg-card border border-border p-3"
            />
            <button
              disabled={busy}
              className="bg-accent rounded p-3 disabled:opacity-50"
            >
              Enviar à equipa
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
