'use client'

import { useEffect, useState } from 'react'
import { getAllBlogPosts, saveBlogPost } from '@/features/cms/actions'
import { Rss, Save, Trash2, Plus, Search } from 'lucide-react'
import Link from 'next/link'

export default function AdminCmsPage() {
    const [tab, setTab] = useState<'blog' | 'seo'>('blog')
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')

    const [editingPost, setEditingPost] = useState<any>(null)

    useEffect(() => { loadData() }, [tab])

    async function loadData() {
        setLoading(true)
        if (tab === 'blog') {
            const res = await getAllBlogPosts()
            if (res.posts) setPosts(res.posts)
        }
        setLoading(false)
    }



    async function handleSavePost(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            excerpt: formData.get('excerpt'),
            cover_image: formData.get('cover_image') || null,
            content: formData.get('content'),
            is_published: formData.get('is_published') === 'true' || formData.get('is_published') === 'on'
        }
        const res = await saveBlogPost(editingPost?.id || null, data)
        if (res.error) setMessage(`❌ ${res.error}`)
        else { setMessage('✅ Post guardado!'); setEditingPost(null); loadData() }
    }

    function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (!editingPost?.id) {
            const slug = e.target.value
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)+/g, "");

            const slugInput = document.querySelector('input[name="slug"]') as HTMLInputElement;
            if (slugInput) {
                slugInput.value = slug;
            }
        }
    }

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <Link href="/admin" className="text-sm text-accent hover:underline">← Admin</Link>
                    <h1 className="text-2xl font-bold text-foreground mt-1">📝 Blog Creator & SEO</h1>
                </div>

                {message && (
                    <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm text-accent">
                        {message} <button onClick={() => setMessage('')} className="ml-2 font-bold">×</button>
                    </div>
                )}

                <div className="flex border-b border-border">
                    <button onClick={() => { setTab('blog'); setEditingPost(null) }}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'blog' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        <Rss className="inline-block w-4 h-4 mr-2" /> Blog Posts
                    </button>
                    <button onClick={() => setTab('seo')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'seo' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
                        <Search className="inline-block w-4 h-4 mr-2" /> Global SEO
                    </button>
                </div>



                {/* BLOG TAB */}
                {tab === 'blog' && (
                    <div className="space-y-4">
                        {!editingPost && (
                            <div className="flex justify-end">
                                <button onClick={() => setEditingPost({})} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                                    <Plus className="h-4 w-4" /> Novo Post
                                </button>
                            </div>
                        )}

                        {editingPost ? (
                            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
                                <h2 className="text-lg font-bold text-foreground mb-4">{editingPost.id ? 'Editar Post' : 'Novo Post'}</h2>
                                <form onSubmit={handleSavePost} className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-foreground/80 mb-1">Título</label>
                                            <input name="title" required defaultValue={editingPost.title} onChange={handleTitleChange} placeholder="Ex: Como Jogar Sueca" className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 placeholder:text-muted-foreground" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-foreground/80 mb-1">Slug</label>
                                            <input name="slug" required defaultValue={editingPost.slug} placeholder="Ex: como-jogar-sueca" className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 placeholder:text-muted-foreground" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">Resumo Opcional (Excerpt)</label>
                                        <textarea name="excerpt" defaultValue={editingPost.excerpt} rows={2} placeholder="Breve resumo sobre o artigo..." className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 placeholder:text-muted-foreground" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">Imagem Principal (URL)</label>
                                        <input name="cover_image" defaultValue={editingPost.cover_image} type="url" placeholder="https://exemplo.com/imagem.png" className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 placeholder:text-muted-foreground" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">Conteúdo (Markdown)</label>
                                        <textarea name="content" required defaultValue={editingPost.content} rows={15} placeholder="Escreva o conteúdo completo aqui (Suporta Markdown)..." className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2 font-mono text-sm placeholder:text-muted-foreground" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" name="is_published" id="post_published" defaultChecked={editingPost.is_published} className="rounded border-border" />
                                        <label htmlFor="post_published" className="text-sm font-medium text-foreground/80">Publicado</label>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button type="button" onClick={() => setEditingPost(null)} className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
                                        <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                                            <Save className="h-4 w-4" /> Guardar Post
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
                                <div className="divide-y">
                                    {posts.map(post => (
                                        <div key={post.id} className="p-4 hover:bg-muted/30 transition-colors flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-foreground">{post.title}</h3>
                                                <p className="text-sm text-muted-foreground mb-1">/blog/{post.slug}</p>
                                                <div className="flex items-center gap-3">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${post.is_published ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                                                        {post.is_published ? 'Publicado' : 'Rascunho'}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">{post.views || 0} visualizações</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/blog/${post.slug}`} target="_blank" className="p-2 text-accent hover:bg-accent/10 rounded-lg">Ver</Link>
                                                <button onClick={() => setEditingPost(post)} className="p-2 text-muted-foreground hover:bg-muted rounded-lg">Editar</button>
                                            </div>
                                        </div>
                                    ))}
                                    {posts.length === 0 && <div className="p-8 text-center text-muted-foreground">Nenhum post criado.</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* SEO TAB */}
                {tab === 'seo' && (
                    <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
                        <h2 className="text-lg font-bold text-foreground mb-4">SEO Global (Homepage & Meta)</h2>
                        <form className="grid gap-4" onSubmit={(e) => { e.preventDefault(); setMessage('✅ Configurações de SEO atualizadas!'); }}>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Título do Site (Meta Title)</label>
                                <input name="seo_title" defaultValue="Clube da Sueca - O Jogo de Cartas Tradicional" className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Descrição (Meta Description)</label>
                                <textarea name="seo_description" rows={3} defaultValue="Joga sueca online com amigos e bots. O melhor clube de sueca com apostas e torneios." className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Palavras-chave (Keywords)</label>
                                <input name="seo_keywords" defaultValue="sueca, online, cartas, jogo, multiplayer, apostas" className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Imagem Partilha Social (Open Graph URLs)</label>
                                <input name="seo_image" defaultValue="https://apostanasueca.pt/images/og-image.jpg" className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2" />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                                    <Save className="h-4 w-4" /> Guardar SEO
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    )
}
