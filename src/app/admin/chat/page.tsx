"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import {
  adminGetConversations,
  getChatMessages,
  sendChatMessage,
  adminUpdateConversationStatus,
} from "@/features/chat/actions";
import { MessageSquare, Send } from "lucide-react";
import Link from "next/link";
import { supportStatuses, supportStatus, type SupportStatus } from "@/features/chat/status";
import { createClient } from "@/lib/supabase/client";

type Conversation = {
  id: string; user_id: string; status: string; subject: string; updated_at: string;
  agent_id?: string | null; resolved_at?: string | null;
  user?: { username: string | null; email: string | null } | null;
  agent?: { username: string | null } | null;
};
type Message = { id: string; sender_id: string | null; is_bot: boolean; message: string; created_at: string };

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");

  const selectedIdRef = useRef<string | undefined>(undefined);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(createClient);
  const activeId = activeConv?.id;


  // Real-time for selected conversation
  useEffect(() => {
    if (!activeId) return;

    const channel = supabase
      .channel(`admin_chat_${activeId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_messages",
          filter: `conversation_id=eq.${activeId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === payload.new.id)
              ? prev
              : [...prev, payload.new as Message],
          );
        },
      )
      .subscribe();

    let cancelled = false;
    const timer = setInterval(async () => {
      try {
        const result = await getChatMessages(activeId);
        if (!cancelled && selectedIdRef.current === activeId && result.messages) setMessages(result.messages);
      } catch { /* Realtime and the next refresh can recover transient failures. */ }
    }, 10000);
    return () => {
      cancelled = true;
      clearInterval(timer);
      void supabase.removeChannel(channel);
    };
  }, [activeId, supabase]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await adminGetConversations(filter);
      if (res.error) setError(res.error);
      if (res.conversations) {
        setConversations(res.conversations);
        setActiveConv((current) => {
          const updated = res.conversations.find((conv: Conversation) => conv.id === current?.id);
          return updated || current;
        });
      }
    } catch {
      setError("Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadConversations();
    const channel = supabase.channel("support_desk_status")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_conversations" }, (payload) => {
        setActiveConv((current) => current && current.id === payload.new.id ? { ...current, ...payload.new } : current);
        void loadConversations();
      }).subscribe();
    const timer = setInterval(() => void loadConversations(), 10000);
    return () => { clearInterval(timer); void supabase.removeChannel(channel); };
  }, [loadConversations, supabase]);

  async function openConversation(conv: Conversation) {
    selectedIdRef.current = conv.id;
    setNewMessage("");
    setActiveConv(conv);
    setMessages([]);
    try {
      const res = await getChatMessages(conv.id);
      if (res.error) setError(res.error);
      if (res.messages && selectedIdRef.current === conv.id) setMessages(res.messages);
    } catch {
      setError("Não foi possível carregar as mensagens.");
    }
  }

  async function handleStatusChange(status: SupportStatus) {
    if (!activeConv || updatingStatus || sending) return;
    const id = activeConv.id;
    setUpdatingStatus(true);
    setError("");
    try {
      const result = await adminUpdateConversationStatus(id, status);
      if (result.error) { setError(result.error); return; }
      setActiveConv((current) => current?.id === id ? { ...current, ...result.conversation } : current);
      await loadConversations();
      const res = await getChatMessages(id);
      if (res.messages && selectedIdRef.current === id) setMessages(res.messages);
    } catch {
      setError("Não foi possível alterar o estado do pedido.");
    } finally { setUpdatingStatus(false); }
  }

  async function handleSendMessage(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newMessage.trim() || !activeConv || sending || updatingStatus) return;
    setSending(true);
    setError("");
    try {
      const result = await sendChatMessage(activeConv.id, newMessage);
      if (result.error) {
        setError(result.error);
        return;
      }
      setNewMessage("");
      setActiveConv((current) => current?.id === activeConv.id ? { ...current, status: result.status || current.status } : current);
      const res = await getChatMessages(activeConv.id);
      if (res.messages && selectedIdRef.current === activeConv.id) setMessages(res.messages);
      await loadConversations();
    } catch {
      setError("Envio não confirmado. Consulte o histórico antes de repetir.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row h-screen">
      {error && (
        <p
          role="alert"
          className="fixed top-4 left-4 right-4 z-50 bg-red-950 text-white rounded p-3"
        >
          {error}
        </p>
      )}
      {/* Sidebar (Conversations List) */}
      <div className="w-full md:w-96 bg-card border-r border-border flex flex-col h-full shrink-0">
        <div className="p-4 border-b border-border">
          <Link
            href="/admin"
            className="text-sm text-accent hover:underline mb-2 inline-block"
          >
            ← Admin Hub
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2 text-primary">
            <MessageSquare className="w-5 h-5 text-primary" /> Support Desk
          </h1>

          <select
            aria-label="Filtrar por estado"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mt-4 w-full rounded-xl border border-border bg-background text-foreground p-2 text-sm font-medium"
          >
            <option value="all">Todas as conversas</option>
            {Object.entries(supportStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto w-full">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              A carregar...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma conversa encontrada.
            </div>
          ) : (
            <div className="divide-y">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  disabled={sending || updatingStatus}
                  onClick={() => openConversation(conv)}
                  className={`w-full text-left p-4 hover:bg-muted/30 transition-colors flex flex-col select-none ${activeConv?.id === conv.id ? "bg-muted border-l-4 border-primary" : "border-l-4 border-transparent"}`}
                >
                  <div className="flex justify-between items-start w-full mb-1">
                    <span className="font-bold text-sm text-foreground truncate">
                      {conv.user?.username ||
                        conv.user?.email}
                    </span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(conv.updated_at).toLocaleTimeString("pt-PT", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mb-2 truncate">
                    Assunto: {conv.subject}
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        conv.status === "waiting_agent"
                          ? "bg-red-500/10 text-red-400"
                          : conv.status === "active"
                            ? "bg-success/10 text-success"
                            : conv.status === "resolved"
                              ? "bg-muted text-muted-foreground"
                              : "bg-yellow-500/10 text-yellow-500"
                      }`}
                    >
                      {supportStatuses[supportStatus(conv.status)]}
                    </span>
                    {conv.agent && (
                      <span className="text-[10px] text-muted-foreground font-medium bg-muted px-2 py-0.5 rounded-full">
                        {conv.agent.username}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full bg-card relative">
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border bg-card flex justify-between items-center shrink-0">
              <div>
                <h2 className="font-bold text-lg text-foreground">
                  {activeConv.user?.username}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {activeConv.user?.email}
                </p>
              </div>

              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Estado do chamado
                <select
                  aria-label="Estado do chamado"
                  value={supportStatus(activeConv.status)}
                  disabled={updatingStatus || sending}
                  onChange={(e) => void handleStatusChange(e.target.value as SupportStatus)}
                  className="rounded-lg border border-border bg-background text-foreground px-3 py-2 text-sm disabled:opacity-50"
                >
                  {Object.entries(supportStatuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-6 overflow-y-auto bg-background flex flex-col gap-4">
              {messages.map((msg, i) => {
                const isAdmin =
                  !msg.is_bot && msg.sender_id !== activeConv.user_id;
                const isBot = msg.is_bot;

                return (
                  <div
                    key={msg.id || i}
                    className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-5 py-3 text-sm shadow-sm ${
                        isAdmin
                          ? "bg-primary text-white rounded-br-sm"
                          : isBot
                            ? "bg-card border border-yellow-500/30 text-foreground rounded-bl-sm relative"
                            : "bg-card border border-border text-foreground rounded-bl-sm"
                      }`}
                    >
                      {isBot && (
                        <div className="text-[10px] font-bold text-yellow-500 mb-1 uppercase tracking-wider">
                          Bot Automatizado
                        </div>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                      <div
                        className={`text-[10px] mt-2 text-right ${isAdmin ? "text-primary-foreground/80" : "text-muted-foreground/70"}`}
                      >
                        {new Date(msg.created_at).toLocaleTimeString("pt-PT", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-card border-t border-border shrink-0">
              {supportStatus(activeConv.status) === "resolved" && <p className="text-xs text-muted-foreground mb-2">Pode continuar a responder. Uma nova mensagem reabre o chamado.</p>}
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  aria-label="Resposta ao utilizador"
                  type="text" maxLength={4000} value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Escreva a resposta para o utilizador..."
                  className="min-w-0 flex-1 rounded-xl border border-border bg-background text-foreground px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <button type="submit" disabled={sending || updatingStatus || !newMessage.trim()}
                  className="px-4 rounded-xl bg-primary text-white font-bold flex items-center gap-2 hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {sending ? "A enviar…" : "Enviar"} <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/70">
            <MessageSquare className="w-16 h-16 mb-4 text-muted-foreground/30" />
            <p className="text-lg font-medium">
              Selecione uma conversa para iniciar o atendimento
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
