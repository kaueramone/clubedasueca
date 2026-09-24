import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { autoPlayForPlayer } from '@/features/game/internal'

export const dynamic = 'force-dynamic'

// Tolerância: turno parado há mais deste tempo (segundos) é considerado AFK.
// O cliente apresenta o prazo absoluto de 30s decidido pelo servidor.
const TURN_TIMEOUT_SECONDS = 30

// Watchdog autoritativo de turnos.
// Chamado periodicamente (pg_cron via pg_net) para destravar partidas cujo
// jogador da vez abandonou/caiu. Protegido por um segredo partilhado.
export async function POST(req: NextRequest) {
    const secret = process.env.CRON_SECRET
    const auth = req.headers.get('authorization')

    if (!secret || auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Service role: as tabelas de jogo têm RLS (migração 103). O watchdog corre
    // sem sessão de utilizador, por isso precisa da service role para LER as
    // mesas paradas e jogar pelos jogadores AFK (ignora RLS).
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    )

    const cutoff = new Date(Date.now() - TURN_TIMEOUT_SECONDS * 1000).toISOString()

    const { data: stuckGames, error } = await supabase
        .from('games')
        .select('id')
        .eq('status', 'playing')
        .lt('turn_started_at', cutoff)
        .limit(100)

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!stuckGames || stuckGames.length === 0) {
        return NextResponse.json({ success: true, processed: 0 })
    }

    const results: { gameId: string; ok: boolean; detail?: string }[] = []
    for (const g of stuckGames) {
        try {
            const res = await autoPlayForPlayer(g.id)
            results.push({ gameId: g.id, ok: !res?.error, detail: res?.error })
        } catch (e: any) {
            results.push({ gameId: g.id, ok: false, detail: e?.message || 'exception' })
        }
    }

    return NextResponse.json({ success: true, processed: results.length, results })
}
