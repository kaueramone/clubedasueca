"use server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { revalidatePath } from "next/cache";
import { getBotResponse } from "./bot-responses";

async function context(admin = false) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_banned")
    .eq("id", user.id)
    .single();
  if (!profile || profile.is_banned || (admin && profile.role !== "admin"))
    throw new Error("Sem permissão");
  return { supabase, user, isAdmin: profile.role === "admin" };
}

export async function getUserConversations() {
  const { supabase, user } = await context();
  const { data, error } = await supabase
    .from("live_conversations")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);
  if (error) return { error: "Não foi possível carregar os pedidos." };
  const ids = (data || []).map((c) => c.agent_id).filter(Boolean);
  const { data: agents } = ids.length
    ? await supabase
        .from("public_profiles")
        .select("id, username, avatar_url")
        .in("id", ids)
    : { data: [] };
  return {
    conversations: (data || []).map((c) => ({
      ...c,
      agent: agents?.find((a) => a.id === c.agent_id) || null,
    })),
  };
}

export async function startConversation(
  subject: string,
  initialMessage: string,
) {
  const { supabase } = await context();
  if (
    !subject.trim() ||
    subject.length > 150 ||
    !initialMessage.trim() ||
    initialMessage.length > 4000
  )
    return {
      error:
        "Indique um assunto (até 150 caracteres) e uma mensagem (até 4000).",
    };
  const { data: conversationId, error } = await supabase.rpc(
    "create_support_ticket",
    { p_subject: subject.trim(), p_message: initialMessage.trim() },
  );
  if (error || !conversationId)
    return { error: "Não foi possível registar o pedido. Tente novamente." };
  // The ticket is already durably queued. FAQ completion is awaited, never fire-and-forget.
  const reply = getBotResponse(initialMessage);
  if (reply) {
    try {
      const { error: botError } = await createServiceClient()
        .from("live_messages")
        .insert({
          conversation_id: conversationId,
          is_bot: true,
          message: reply,
        });
      if (botError)
        console.error("[SUPPORT_FAQ] Reply unavailable; ticket remains queued");
    } catch {
      console.error("[SUPPORT_FAQ] Reply unavailable; ticket remains queued");
    }
  }
  revalidatePath("/dashboard/support");
  revalidatePath("/admin/chat");
  return { success: true, conversationId: String(conversationId) };
}

export async function sendChatMessage(conversationId: string, message: string) {
  const { supabase, user, isAdmin } = await context();
  if (!message.trim() || message.length > 4000)
    return { error: "A mensagem deve ter entre 1 e 4000 caracteres." };
  const { data: conv } = await supabase
    .from("live_conversations")
    .select("user_id, status")
    .eq("id", conversationId)
    .single();
  if (!conv || (!isAdmin && conv.user_id !== user.id))
    return { error: "Conversa indisponível." };
  const { error } = await supabase.rpc("append_support_message", {
    p_conversation_id: conversationId,
    p_message: message.trim(),
  });
  if (error) return { error: "Não foi possível enviar a mensagem." };
  revalidatePath("/dashboard/support");
  revalidatePath("/admin/chat");
  return { success: true };
}

export async function getChatMessages(conversationId: string) {
  const { supabase } = await context();
  const { data, error } = await supabase
    .from("live_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(1000);
  if (error) return { error: "Não foi possível carregar as mensagens." };
  const ids = (data || []).map((m) => m.sender_id).filter(Boolean);
  const { data: profiles } = ids.length
    ? await supabase
        .from("public_profiles")
        .select("id, username, avatar_url")
        .in("id", ids)
    : { data: [] };
  return {
    messages: (data || []).map((m) => ({
      ...m,
      sender: profiles?.find((p) => p.id === m.sender_id) || null,
    })),
  };
}

export async function adminGetConversations(statusFilter?: string) {
  await context(true);
  let query = createServiceClient()
    .from("live_conversations")
    .select(
      "*, user:profiles!user_id(username, email), agent:profiles!agent_id(username)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  if (statusFilter && statusFilter !== "all")
    query = query.eq("status", statusFilter);
  const { data, error } = await query;
  return error
    ? { error: "Não foi possível carregar os pedidos." }
    : { conversations: data };
}

export async function adminAssignConversation(conversationId: string) {
  const { user } = await context(true);
  const { data, error } = await createServiceClient()
    .from("live_conversations")
    .update({
      agent_id: user.id,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .in("status", ["open", "waiting_agent", "active"])
    .or(`agent_id.is.null,agent_id.eq.${user.id}`)
    .select("id")
    .maybeSingle();
  if (error || !data)
    return { error: "Pedido indisponível ou atribuído a outro agente." };
  revalidatePath("/admin/chat");
  return { success: true };
}

export async function adminResolveConversation(conversationId: string) {
  const { supabase } = await context(true);
  const { error } = await supabase.rpc("resolve_support_ticket", {
    p_conversation_id: conversationId,
  });
  if (error) return { error: "Não foi possível resolver o pedido." };
  revalidatePath("/admin/chat");
  return { success: true };
}
