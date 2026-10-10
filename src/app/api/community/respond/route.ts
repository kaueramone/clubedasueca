import { NextRequest, NextResponse, after } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { getBotReply } from '@/features/global-chat/ai'
import { createServiceClient } from '@/lib/supabase/service'
import { buildConversation, type CommunityMessage } from '@/features/global-chat/conversation'

const BOT_USER_ID = process.env.NEXT_PUBLIC_BOT_USER_ID ?? '00000000-0000-0000-0000-000000000001'
export const maxDuration = 60

export async function POST(req: NextRequest) {
    const secret = process.env.COMMUNITY_WEBHOOK_SECRET
    const actual = Buffer.from(req.headers.get('authorization') || '')
    const expected = Buffer.from(`Bearer ${secret || ''}`)
    if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    try {
        const reader = req.body?.getReader()
        if (!reader) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
        const chunks: Uint8Array[] = []
        let length = 0
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            length += value.byteLength
            if (length > 16000) {
                await reader.cancel()
                return NextResponse.json({ error: 'Body too large' }, { status: 413 })
            }
            chunks.push(value)
        }
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        if (body.type !== 'INSERT' || body.schema !== 'public' || body.table !== 'global_messages'
            || !/^[0-9a-f-]{36}$/i.test(body.record?.id || '')) {
            return NextResponse.json({ error: 'Invalid webhook' }, { status: 400 })
        }
        if (body.record.user_id === BOT_USER_ID) return NextResponse.json({ ok: true })
        const supabase = createServiceClient()
        // Authoritative stored message, atomic deduplication and per-sender limit.
        const { data: claimed, error } = await supabase.rpc('claim_community_message', { p_message_id: body.record.id })
        if (error) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
        if (!claimed || claimed.user_id === BOT_USER_ID) return NextResponse.json({ ok: true })
        after(async () => {
            try {
                const { data: latest, error: latestError } = await supabase.from('global_messages')
                    .select('id, user_id, content, created_at').eq('id', body.record.id).single()
                if (latestError || !latest || latest.user_id !== claimed.user_id || latest.user_id === BOT_USER_ID) return
                const timestamp = Date.parse(latest.created_at)
                // Do not answer stale/backfilled webhooks as if they were current questions.
                if (!Number.isFinite(timestamp) || Date.now() - timestamp > 120000 || timestamp - Date.now() > 30000) return
                const { data: recent, error: contextError } = await supabase.from('global_messages')
                    .select('id, user_id, content, created_at')
                    .gte('created_at', new Date(timestamp - 15 * 60000).toISOString())
                    .lte('created_at', latest.created_at)
                    .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(24)
                if (contextError || !recent) return
                const userIds = [...new Set([...recent.map(m => m.user_id), latest.user_id])]
                const { data: profiles, error: profilesError } = await supabase.from('public_profiles')
                    .select('id, username').in('id', userIds)
                if (profilesError) return
                const conversation = buildConversation(latest as CommunityMessage, [...recent].reverse() as CommunityMessage[], profiles || [], BOT_USER_ID)
                const { data: knowledge, error: knowledgeError } = await supabase.from('community_knowledge')
                    .select('topic_id, published_content').eq('is_active', true).order('topic_id').limit(41)
                if (knowledgeError || !knowledge?.length || knowledge.length > 40) return
                const topics = knowledge.filter(k => typeof k.published_content === 'string')
                    .map(k => ({ id: k.topic_id, facts: k.published_content as string }))
                const reply = await getBotReply(conversation, topics)
                if (!reply) return
                const { error: insertError } = await supabase.from('global_messages').insert({ user_id: BOT_USER_ID, content: reply })
                if (insertError) console.error('[community/respond] Failed to store reply', insertError.code)
            } catch {
                console.error('[community/respond] Failed to generate reply')
            }
        })
        return NextResponse.json({ ok: true })
    } catch {
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }
}
