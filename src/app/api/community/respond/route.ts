import { NextRequest, NextResponse } from 'next/server'
import { getBotReply } from '@/features/global-chat/ai'
import { createServiceClient } from '@/lib/supabase/service'

const BOT_USER_ID = process.env.NEXT_PUBLIC_BOT_USER_ID ?? '00000000-0000-0000-0000-000000000001'
const WEBHOOK_SECRET = process.env.COMMUNITY_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
    try {
        // Support both Supabase Database Webhook format and direct call format
        const body = await req.json()

        // Supabase webhook sends: { type, table, schema, record, old_record }
        // Direct call sends: { message, userId }
        let message: string
        let userId: string

        if (body.type === 'INSERT' && body.record) {
            // Supabase Database Webhook format
            // Verify webhook secret if configured
            if (WEBHOOK_SECRET) {
                const authHeader = req.headers.get('authorization')
                if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
                }
            }
            message = body.record.content
            userId = body.record.user_id
        } else {
            // Direct call format (legacy / from client)
            message = body.message
            userId = body.userId
        }

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
