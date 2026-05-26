import { NextRequest, NextResponse } from 'next/server'
import { after } from 'next/server'
import { getBotReply } from '@/features/global-chat/ai'
import { createServiceClient } from '@/lib/supabase/service'

const BOT_USER_ID = process.env.NEXT_PUBLIC_BOT_USER_ID ?? '00000000-0000-0000-0000-000000000001'
const WEBHOOK_SECRET = process.env.COMMUNITY_WEBHOOK_SECRET

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        // Supabase Database Webhook format: { type, table, schema, record, old_record }
        let message: string
        let userId: string

        if (body.type === 'INSERT' && body.record) {
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
            // Legacy direct call format
            message = body.message
            userId = body.userId
        }

        // Anti-loop: never trigger bot for bot messages
        if (!message || userId === BOT_USER_ID) {
            return NextResponse.json({ ok: true })
        }

        // Respond immediately so Supabase webhook doesn't timeout (5s limit)
        // then process in background via after()
        after(async () => {
            try {
                const reply = await getBotReply(message)
                if (!reply) return

                const supabase = createServiceClient()
                const { error } = await supabase.from('global_messages').insert({
                    user_id: BOT_USER_ID,
                    content: reply,
                })
                if (error) console.error('[community/respond] insert error:', JSON.stringify(error))
                else console.log('[community/respond] bot reply inserted OK')
            } catch (err) {
                console.error('[community/respond] background error:', err)
            }
        })

        return NextResponse.json({ ok: true })
    } catch (err) {
        console.error('[community/respond]', err)
        return NextResponse.json({ ok: false }, { status: 500 })
    }
}
