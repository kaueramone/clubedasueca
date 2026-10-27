import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'

// getClaims verifies the token; do not trust a locally decoded cookie's AAL.
export async function hasAdminMfa(client: SupabaseClient): Promise<boolean> {
    const { data, error } = await client.auth.getClaims()
    return !error && data?.claims.aal === 'aal2'
}

export async function requireAdminMfa(client: SupabaseClient) {
    if (!await hasAdminMfa(client)) throw new Error('Confirme o código do autenticador em Segurança administrativa para continuar.')
}
