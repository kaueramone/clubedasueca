import 'server-only'
import { createServiceClient } from '@/lib/supabase/service'

/** Only the authenticated cron route imports this helper; SQL rechecks the deadline under lock. */
export async function autoPlayForPlayer(gameId: string) {
    const { data, error } = await createServiceClient().rpc('process_turn_timeout', { p_game_id: gameId })
    return error ? { error: error.message } : data
}
