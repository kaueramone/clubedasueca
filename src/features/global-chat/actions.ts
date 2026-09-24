"use server";

import { createClient } from "@/lib/supabase/server";

export async function getGlobalMessages() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("global_messages")
    .select("id, content, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (!data) return [];

  const userIds = [...new Set(data.map((m) => m.user_id))];
  const { data: profiles } = await supabase
    .from("public_profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);
  return data.reverse().map((m) => ({
    id: m.id,
    content: m.content,
    created_at: m.created_at,
    user_id: m.user_id,
    username: profiles?.find((p) => p.id === m.user_id)?.username || "Jogador",
    avatar_url: profiles?.find((p) => p.id === m.user_id)?.avatar_url || null,
    game_count: 0,
  }));
}

export async function sendGlobalMessage(content: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const text = content.trim().slice(0, 200);
  if (!text) return { error: "Mensagem vazia" };

  const { data: inserted, error } = await supabase
    .from("global_messages")
    .insert({ user_id: user.id, content: text })
    .select("id, created_at")
    .single();

  if (error) return { error: error.message };

  return {
    success: true,
    id: inserted.id,
    created_at: inserted.created_at,
  };
}
