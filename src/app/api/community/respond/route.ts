import { NextRequest, NextResponse } from 'next/server'
import { getBotReply } from '@/features/global-chat/ai'
import { createServiceClient } from '@/lib/supabase/service'

const BOT_USER_ID = process.env.NEXT_PUBLIC_BOT_USER_ID ?? '00000000-0000-0000-0000-000000000001'

export async function POST(req: NextRequest) {
    try {
        const { message, userId } = await req.json()

        // Anti-loop: never trigger bot for bot messages
        if (!message || userId === BOT_USER_ID) {
            return NextResponse.json({ ok: true })
        }

        const reply = await getBotReply(message)
        if (!reply) return NextResponse.json({ ok: true })

        const supabase = createServiceClient()
        await supabase.from('global_messages').insert({
            user_id: BOT_USER_ID,
            content: reply,
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[community/respond]', err)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
