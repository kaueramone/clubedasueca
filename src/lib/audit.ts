import { SupabaseClient } from '@supabase/supabase-js'

interface AuditEntry {
  userId?: string | null
  action: string
  entityType?: string
  entityId?: string
  details?: Record<string, unknown>
  ipAddress?: string
}

/**
 * Insere um registo de auditoria na tabela audit_logs.
 * Falhas no audit log NÃO devem bloquear a operação principal,
 * por isso os erros são silenciados (logged para console).
 */
export async function logAudit(
  supabase: SupabaseClient,
  entry: AuditEntry
): Promise<void> {
  try {
    await supabase.from('audit_logs').insert({
      user_id: entry.userId || null,
      action: entry.action,
      entity_type: entry.entityType || null,
      entity_id: entry.entityId || null,
      details: entry.details || {},
      ip_address: entry.ipAddress || null,
    })
  } catch (err) {
    console.error('[AUDIT] Failed to log audit entry:', err)
  }
}
