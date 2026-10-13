"use server";
import { createClient } from "@/lib/supabase/server";
import { assertBetaMode } from "@/lib/platform-mode";
import { revalidatePath } from "next/cache";

export async function deposit(formData: FormData) {
  try {
    assertBetaMode();
  } catch {
    return { error: "Adição de créditos de teste indisponível." };
  }
  const amount = Number(formData.get("amount"));
  if (!Number.isSafeInteger(amount) || amount < 50 || amount > 10000)
    return { error: "Escolha entre 50 e 10 000 créditos inteiros de teste." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Utilizador não autenticado" };
  const { data, error } = await supabase.rpc("process_deposit", {
    p_user_id: user.id,
    p_amount: amount,
  });
  if (error)
    return {
      error:
        error.message.startsWith('IDENTITY_REQUIRED: ') ? error.message.slice('IDENTITY_REQUIRED: '.length) :
        "Não foi possível adicionar os créditos. Confirme o limite da carteira e tente novamente.",
    };
  revalidatePath("/dashboard", "layout");
  return { success: true, new_balance: data?.new_balance };
}

export async function requestWithdrawal(_formData: FormData) {
  return {
    error:
      "Levantamentos indisponíveis no beta. Os créditos são fictícios e não têm valor monetário.",
  };
}
