import { createClient } from '@supabase/supabase-js'

/**
 * Supabase client with service role key — bypasses RLS.
 * Use only in server-side code (Server Actions, Route Handlers).
 * Never expose this client to the browser.
 */
export function createServiceClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}
