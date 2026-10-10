'use client'

import { useState } from 'react'
import { updateKnowledge, type KnowledgeRow } from '@/features/global-chat/knowledge-actions'

export function KnowledgeEditor({ initialTopics }: { initialTopics: KnowledgeRow[] }) {
    const [topics, setTopics] = useState(initialTopics)
    const [selected, setSelected] = useState<KnowledgeRow | null>(initialTopics[0] || null)
    const [id, setId] = useState(initialTopics[0]?.topic_id || '')
    const [title, setTitle] = useState(initialTopics[0]?.title || '')
    const [facts, setFacts] = useState(initialTopics[0]?.draft_content || '')
    const [search, setSearch] = useState('')
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState('')
    const dirty = selected ? title !== selected.title || facts !== selected.draft_content : Boolean(title || facts || id)
    function choose(topic: KnowledgeRow | null) {
        if (dirty && !window.confirm('Tens alterações por guardar. Descartá-las?')) return
        setSelected(topic); setId(topic?.topic_id || ''); setTitle(topic?.title || ''); setFacts(topic?.draft_content || ''); setNotice('')
    }
    async function perform(operation: 'save' | 'publish' | 'pause' | 'resume') {
        setBusy(true); setNotice('')
        try {
            const result = await updateKnowledge({ operation, id, title, facts, revision: selected?.revision || 0 })
            if (result.error) { setNotice(result.error); return }
            if (result.topics) {
                setTopics(result.topics)
                const updated = result.topics.find(t => t.topic_id === id) || null
                setSelected(updated); setTitle(updated?.title || ''); setFacts(updated?.draft_content || '')
                setNotice(operation === 'save' ? 'Rascunho guardado. Publica para disponibilizar ao robô.' : operation === 'publish' ? 'Tópico publicado.' : operation === 'pause' ? 'Tópico pausado.' : 'Tópico reativado.')
            }
        } catch { setNotice('Falha de ligação. Tenta novamente; o teu texto foi mantido.') }
        finally { setBusy(false) }
    }
    const button = 'rounded-lg border border-border px-4 py-2 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted'
    return <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-3">
            <button className={button + ' w-full'} disabled={busy || topics.length >= 40} onClick={() => choose(null)}>Novo tópico</button>
            <label className="block text-sm" htmlFor="knowledge-search">Procurar tópico</label>
            <input id="knowledge-search" className="w-full rounded-lg border border-border p-2" value={search} onChange={e => setSearch(e.target.value)} />
            <div className="max-h-[600px] overflow-y-auto space-y-1">
                {topics.filter(t => (t.title + t.topic_id).toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(t => <button
                    key={t.topic_id} disabled={busy} aria-pressed={selected?.topic_id === t.topic_id} onClick={() => choose(t)}
                    className={'w-full rounded-lg p-3 text-left text-sm border ' + (selected?.topic_id === t.topic_id ? 'border-primary bg-primary/10' : 'border-transparent hover:bg-muted')}>
                    <span className="block font-medium">{t.title}</span>
                    <span className="text-xs text-muted-foreground">{t.is_active ? 'Publicado' : t.published_content ? 'Pausado' : 'Rascunho'}{t.published_content !== t.draft_content && t.published_content ? ' · alterações por publicar' : ''}</span>
                </button>)}
            </div>
        </aside>
        <form className="min-w-0 space-y-4 rounded-xl border border-border bg-card p-5" onSubmit={e => { e.preventDefault(); void perform('save') }}>
            <h2 className="text-xl font-semibold">{selected ? selected.title : 'Novo tópico'}</h2>
            <label className="block text-sm" htmlFor="knowledge-id">Identificador (letras minúsculas, números, _ ou -)</label>
            <input id="knowledge-id" className="w-full rounded-lg border border-border p-2" value={id} disabled={busy || Boolean(selected)} required pattern={'[a-z][a-z0-9_\\-]{1,47}'} maxLength={48} onChange={e => setId(e.target.value)} />
            <label className="block text-sm" htmlFor="knowledge-title">Título</label>
            <input id="knowledge-title" className="w-full rounded-lg border border-border p-2" value={title} disabled={busy} required minLength={2} maxLength={100} onChange={e => setTitle(e.target.value)} />
            <label className="block text-sm" htmlFor="knowledge-facts">Informações públicas para o robô</label>
            <textarea id="knowledge-facts" className="w-full rounded-lg border border-border p-3 min-h-64" value={facts} disabled={busy} required maxLength={2000} onChange={e => setFacts(e.target.value)} />
            <p className="text-xs text-muted-foreground">{facts.length}/2000 caracteres{selected ? ` · revisão ${selected.revision}` : ''}{dirty ? ' · alterações por guardar' : ''}</p>
            <div className="flex flex-wrap gap-2">
                <button className={button} disabled={busy || !dirty} type="submit">{busy ? 'A guardar…' : 'Guardar rascunho'}</button>
                <button className={button + ' bg-primary text-primary-foreground'} type="button" disabled={busy || dirty || !selected} onClick={() => void perform('publish')}>Publicar rascunho</button>
                {selected?.published_content && <button className={button} type="button" disabled={busy || dirty} onClick={() => void perform(selected.is_active ? 'pause' : 'resume')}>{selected.is_active ? 'Pausar tópico' : 'Reativar publicação'}</button>}
            </div>
            <p role="status" aria-live="polite" className="text-sm">{notice}</p>
            {selected?.published_content && <details className="rounded-lg bg-muted p-3 text-sm"><summary className="cursor-pointer font-medium">Ver conteúdo publicado {selected.is_active ? '(ativo)' : '(pausado)'}</summary><p className="mt-3 whitespace-pre-wrap">{selected.published_content}</p></details>}
        </form>
    </div>
}
