"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { startConversation, sendChatMessage } from "@/features/chat/actions";

// Define the Support "User" ID as a constant string mapping to recognize it in UI
const SUPPORT_CONTACT_ID = "support-official-contact";

export async function searchUsers(query: string) {
  if (!query || query.length < 3) return [];

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Search by username, full_name, or email
  const { data, error } = await supabase
    .from("public_profiles")
    .select("id, username, avatar_url")
    .neq("id", user.id)
    .ilike("username", `%${query.replace(/[%_]/g, "").slice(0, 50)}%`)
    .limit(10);

  if (error) {
    console.error("Error searching users:", error);
    return [];
  }

  return data || [];
}

export async function sendFriendRequest(targetUserId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // user1_id must be the smaller UUID
  const user1_id = user.id < targetUserId ? user.id : targetUserId;
  const user2_id = user.id < targetUserId ? targetUserId : user.id;

  const { error } = await supabase.from("friendships").insert({
    user1_id,
    user2_id,
    status: "pending",
    sender_id: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Já existe um pedido pendente ou já são amigos." };
    }
    console.error("Error sending friend request:", error);
    return { error: "Failed to send request" };
  }

  revalidatePath("/dashboard/chat");
  return { success: true };
}

export async function acceptFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("id", friendshipId)
    // Ensure only the receiver can accept
    .neq("sender_id", user.id)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (error) {
    console.error("Error accepting friend request:", error);
    return { error: "Failed to accept request" };
  }

  revalidatePath("/dashboard/chat");
  return { success: true };
}

export async function rejectFriendRequest(friendshipId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (error) return { error: "Failed to reject request" };

  revalidatePath("/dashboard/chat");
  return { success: true };
}

export async function getContacts() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { friends: [], pendingRequests: [] };

  // Get friendships where status is accepted or pending
  const { data: friendships, error } = await supabase
    .from("friendships")
    .select("id, status, sender_id, created_at, user1_id, user2_id")
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

  if (error) {
    console.error("Error fetching contacts:", error);
    return { friends: [], pendingRequests: [] };
  }

  const ids = [
    ...new Set((friendships || []).flatMap((f) => [f.user1_id, f.user2_id])),
  ];
  const { data: profiles } = ids.length
    ? await supabase
        .from("public_profiles")
        .select("id, username, avatar_url")
        .in("id", ids)
    : { data: [] };
  const friends: any[] = [];
  const pendingRequests: any[] = [];

  friendships?.forEach((f: any) => {
    const u1 = profiles?.find((p) => p.id === f.user1_id);
    const u2 = profiles?.find((p) => p.id === f.user2_id);
    const isUser1 = u1?.id === user.id;
    const friendProfile = isUser1 ? u2 : u1;

    if (f.status === "accepted") {
      friends.push({
        friendship_id: f.id,
        ...friendProfile,
      });
    } else if (f.status === "pending") {
      // Include if I am the receiver
      if (f.sender_id !== user.id) {
        pendingRequests.push({
          friendship_id: f.id,
          ...friendProfile,
          created_at: f.created_at,
        });
      }
    }
  });

  return { friends, pendingRequests };
}

export async function sendDirectMessage(
  receiverId: string,
  content: string,
  imageUrl?: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!content && !imageUrl) return { error: "Message cannot be empty" };

  if (receiverId === SUPPORT_CONTACT_ID) {
    // Find existing open conversation
    const { data: conv } = await supabase
      .from("live_conversations")
      .select("id")
      .eq("user_id", user.id)
      .in("status", ["open", "waiting_agent", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const message = content + (imageUrl ? ` [Imagem: ${imageUrl}]` : "");
    if (!conv) return startConversation("Nova conversa", message);
    return sendChatMessage(conv.id, message);
  }

  const { error } = await supabase.from("chat_messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    content: content || null,
    image_url: imageUrl || null,
  });

  if (error) {
    console.error("Error sending message:", error);
    return { error: "Failed to send message" };
  }

  return { success: true };
}

export async function getDirectMessages(contactId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  if (contactId === SUPPORT_CONTACT_ID) {
    // Get user's open conversations
    const { data: conv } = await supabase
      .from("live_conversations")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!conv) return [];

    const { data, error } = await supabase
      .from("live_messages")
      .select("id, sender_id, message, created_at, is_bot")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true });

    if (error) return [];
    return data.map((m: any) => ({
      id: m.id,
      sender_id: m.is_bot
        ? SUPPORT_CONTACT_ID
        : m.sender_id || SUPPORT_CONTACT_ID,
      receiver_id: m.sender_id === user.id ? SUPPORT_CONTACT_ID : user.id,
      content: m.message,
      created_at: m.created_at,
    }));
  }

  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${contactId}),and(sender_id.eq.${contactId},receiver_id.eq.${user.id})`,
    )
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching messages:", error);
    return [];
  }

  // Mark as read
  const unreadMessages = data.filter(
    (m) => m.receiver_id === user.id && !m.is_read,
  );
  if (unreadMessages.length > 0) {
    const unreadIds = unreadMessages.map((m) => m.id);
    await supabase
      .from("chat_messages")
      .update({ is_read: true })
      .in("id", unreadIds);
  }

  return data;
}
