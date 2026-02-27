'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getBotResponse } from './bot-responses'

// ============================================
// PUBLIC / USER ACTIONS
// ============================================

export async function getUserConversations() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data, error } = await supabase
        .from('live_conversations')
        .select(`
            *,
            agent:profiles!agent_id(username, avatar_url)
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

    if (error) return { error: error.message }
    return { conversations: data }
}

export async function startConversation(subject: string, initialMessage: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    // Create conversation
    const { data: conversation, error: convError } = await supabase
        .from('live_conversations')
        .insert({
            user_id: user.id,
            subject: subject,
            status: 'open'
        })
        .select()
        .single()

    if (convError || !conversation) return { error: convError?.message || 'Erro ao criar conversa' }

    // Send initial message
    const { error: msgError } = await supabase
        .from('live_messages')
        .insert({
            conversation_id: conversation.id,
            sender_id: user.id,
            message: initialMessage
        })

    if (msgError) return { error: msgError.message }

    // Trigger Bot evaluation (non-blocking)
    evaluateBotResponse(conversation.id, initialMessage).catch(console.error)

    revalidatePath('/dashboard')
    return { success: true, conversationId: conversation.id }
}

export async function sendChatMessage(conversationId: string, message: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    // Insert message
    const { error: msgError } = await supabase
        .from('live_messages')
        .insert({
            conversation_id: conversationId,
            sender_id: user.id,
            message: message
        })

    if (msgError) return { error: msgError.message }

    // Update conversation timestamp
    await supabase.from('live_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)

    // Evaluate bot if still in 'open' status
    const { data: conv } = await supabase.from('live_conversations').select('status, agent_id').eq('id', conversationId).single()
    if (conv && conv.status === 'open' && !conv.agent_id) {
        evaluateBotResponse(conversationId, message, true).catch(console.error)
    }

    revalidatePath('/dashboard')
    revalidatePath('/admin/chat')
    return { success: true }
}

export async function getChatMessages(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { data, error } = await supabase
        .from('live_messages')
        .select(`
            *,
            sender:profiles!sender_id(username, role, avatar_url)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

    if (error) return { error: error.message }
    return { messages: data }
}

async function evaluateBotResponse(conversationId: string, userMessage: string, isFollowUp = false) {
    const supabase = await createClient()

    // Quick delay to simulate thinking
    await new Promise(resolve => setTimeout(resolve, 1500))

    const botResponse = getBotResponse(userMessage)

    if (botResponse) {
        // Send bot reply
        await supabase.from('live_messages').insert({
            conversation_id: conversationId,
            is_bot: true,
            message: botResponse
        })
        await supabase.from('live_conversations').update({ updated_at: new Date().toISOString() }).eq('id', conversationId)
    } else if (!isFollowUp) {
        // If no match on initial message, send generic wait message and move to waiting queue
        await supabase.from('live_messages').insert({
            conversation_id: conversationId,
            is_bot: true,
            message: '[Bot Automatizado] 👋 Olá! Recebemos a sua mensagem. Um dos nossos agentes humanos irá responder-lhe assim que possível. Obrigado pela sua paciência!'
        })
        await supabase.from('live_conversations')
            .update({ status: 'waiting_agent', updated_at: new Date().toISOString() })
            .eq('id', conversationId)
    }
}

// ============================================
// ADMIN ACTIONS
// ============================================

export async function adminGetConversations(statusFilter?: string) {
    const supabase = await createClient()

    let query = supabase
        .from('live_conversations')
        .select(`
            *,
            user:profiles!user_id(username, email),
            agent:profiles!agent_id(username)
        `)
        .order('updated_at', { ascending: false })

    if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
    }

    const { data, error } = await query
    if (error) return { error: error.message }
    return { conversations: data }
}

export async function adminAssignConversation(conversationId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    const { error } = await supabase
        .from('live_conversations')
        .update({
            agent_id: user.id,
            status: 'active',
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (error) return { error: error.message }
    revalidatePath('/admin/chat')
    return { success: true }
}

export async function adminResolveConversation(conversationId: string) {
    const supabase = await createClient()

    const { error } = await supabase
        .from('live_conversations')
        .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)

    if (error) return { error: error.message }

    // Add system message
    await supabase.from('live_messages').insert({
        conversation_id: conversationId,
        is_bot: true,
        message: 'A conversa foi marcada como resolvida pelo agente.'
    })

    revalidatePath('/admin/chat')
    return { success: true }
}
