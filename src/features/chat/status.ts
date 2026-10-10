export const supportStatuses = {
  waiting_agent: "Em espera",
  active: "Em resolução",
  resolved: "Resolvido",
} as const;

export type SupportStatus = keyof typeof supportStatuses;

export function supportStatus(status: string): SupportStatus {
  if (status === "active") return "active";
  if (status === "resolved" || status === "closed") return "resolved";
  return "waiting_agent";
}
