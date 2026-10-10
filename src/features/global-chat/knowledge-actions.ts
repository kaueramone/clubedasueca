'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type KnowledgeRow = {
    topic_id: string; title: string; draft_content: string; published_content: string | null
    is_active: boolean; revision: number; updated_at: string; published_at: string | null
}

async function adminClient() {
    const client = await createClient()
    const { data: { user }, error } = await client.auth.getUser()
    if (error || !user) throw new Error('Sessão expirada. Entra novamente.')
    const { data } = await client.from('profiles').select('role, is_banned').eq('id', user.id).single()
    if (data?.role !== 'admin' || data.is_banned) throw new Error('Acesso reservado à administração.')
    return client
}

export async function listKnowledge(): Promise<KnowledgeRow[]> {
    const client = await adminClient()
    const { data, error } = await client.from('community_knowledge')
        .select('topic_id,title,draft_content,published_content,is_active,revision,updated_at,published_at').order('title')
    if (error) throw new Error('Não foi possível carregar a base de conhecimento.')
    return data || []
}

export async function updateKnowledge(input: { operation: 'save' | 'publish' | 'pause' | 'resume'; id: string; title: string; facts: string; revision: number }) {
    try {
        const client = await adminClient()
        if (!['save', 'publish', 'pause', 'resume'].includes(input.operation)
            || !/^[a-z][a-z0-9_-]{1,47}$/.test(input.id) || !Number.isInteger(input.revision) || input.revision < 0
            || typeof input.title !== 'string' || typeof input.facts !== 'string'
            || input.title.trim().length < 2 || input.title.length > 100 || !input.facts.trim() || input.facts.length > 2000) {
            return { error: 'Verifica o identificador, título e conteúdo (até 2000 caracteres).' }
        }
        const { error } = await client.rpc('write_community_knowledge', {
            p_operation: input.operation, p_topic_id: input.id, p_title: input.title,
            p_facts: input.facts, p_revision: input.revision,
        })
        if (error) return { error: error.code === '40001'
            ? 'Este tópico foi alterado por outro administrador. Recarrega a página antes de editar.'
            : 'Não foi possível guardar. Verifica os limites: 40 tópicos, 24000 caracteres publicados e nenhum segredo ou credencial.' }
        revalidatePath('/admin/robot')
        return { topics: await listKnowledge() }
    } catch (error) { return { error: error instanceof Error ? error.message : 'Falha ao atualizar a base.' } }
}
