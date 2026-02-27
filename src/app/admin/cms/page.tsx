'use client'

import { useEffect, useState } from 'react'
import { getAllPages, savePage, deletePage, getAllBlogPosts, saveBlogPost } from '@/features/cms/actions'
import { FileText, Rss, Save, Trash2, Plus, Type, FileSignature, Search } from 'lucide-react'
import Link from 'next/link'

export default function AdminCmsPage() {
    const [tab, setTab] = useState<'pages' | 'blog' | 'seo'>('pages')
    const [pages, setPages] = useState<any[]>([])
    const [posts, setPosts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [message, setMessage] = useState('')

    const [editingPage, setEditingPage] = useState<any>(null)
    const [editingPost, setEditingPost] = useState<any>(null)

    useEffect(() => { loadData() }, [tab])

    async function loadData() {
        setLoading(true)
        if (tab === 'pages') {
            const res = await getAllPages()
            if (res.pages) setPages(res.pages)
        } else if (tab === 'blog') {
            const res = await getAllBlogPosts()
            if (res.posts) setPosts(res.posts)
        }
        setLoading(false)
    }

    async function handleSavePage(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const formData = new FormData(e.currentTarget)
        const data = {
            title: formData.get('title'),
            slug: formData.get('slug'),
            content: formData.get('content'),
            is_published: formData.get('is_published') === 'true' || formData.get('is_published') === 'on'
        }
        const res = await savePage(editingPage?.id || null, data)
        if (res.error) setMessage(`❌ ${res.error}`)
        else { setMessage('✅ Página guardada!'); setEditingPage(null); loadData() }
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

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div>
                    <Link href="/admin" className="text-sm text-accent hover:underline">← Admin</Link>
                    <h1 className="text-2xl font-bold text-gray-900 mt-1">📝 Content Management System</h1>
                </div>

                {message && (
                    <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm text-blue-700">
                        {message} <button onClick={() => setMessage('')} className="ml-2 font-bold">×</button>
                    </div>
                )}

                <div className="flex border-b border-gray-200">
                    <button onClick={() => { setTab('pages'); setEditingPage(null) }}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'pages' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <FileText className="inline-block w-4 h-4 mr-2" /> Páginas Estáticas
                    </button>
                    <button onClick={() => { setTab('blog'); setEditingPost(null) }}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'blog' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Rss className="inline-block w-4 h-4 mr-2" /> Blog Posts
                    </button>
                    <button onClick={() => setTab('seo')}
                        className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${tab === 'seo' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Search className="inline-block w-4 h-4 mr-2" /> Global SEO
                    </button>
                </div>

                {/* PAGES TAB */}
                {tab === 'pages' && (
                    <div className="space-y-4">
                        {!editingPage && (
                            <div className="flex justify-end">
                                <button onClick={() => setEditingPage({})} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 transition-colors">
                                    <Plus className="h-4 w-4" /> Nova Página
                                </button>
                            </div>
                        )}

                        {editingPage ? (
                            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">{editingPage.id ? 'Editar Página' : 'Nova Página'}</h2>
                                <form onSubmit={handleSavePage} className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                            <input name="title" required defaultValue={editingPage.title} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="Termos e Condições" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL)</label>
                                            <input name="slug" required defaultValue={editingPage.slug} className="w-full rounded-lg border border-gray-300 px-3 py-2" placeholder="termos-e-condicoes" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo (Markdown)</label>
                                        <textarea name="content" required defaultValue={editingPage.content} rows={15} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm" placeholder="# Bem-vindo..." />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" name="is_published" id="is_published" defaultChecked={editingPage.is_published} className="rounded border-gray-300" />
                                        <label htmlFor="is_published" className="text-sm font-medium text-gray-700">Publicado (Visível publicamente)</label>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button type="button" onClick={() => setEditingPage(null)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                                        <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                                            <Save className="h-4 w-4" /> Guardar Página
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                                <div className="divide-y">
                                    {pages.map(page => (
                                        <div key={page.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center border-l-4" style={{ borderLeftColor: page.is_published ? '#10B981' : '#E5E7EB' }}>
                                            <div>
                                                <h3 className="font-bold text-gray-900">{page.title}</h3>
                                                <p className="text-sm text-gray-500 mb-1">/{page.slug}</p>
                                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${page.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {page.is_published ? 'Publicado' : 'Rascunho'}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/${page.slug}`} target="_blank" className="p-2 text-accent hover:bg-accent/10 rounded-lg" title="Ver no site">Ver</Link>
                                                <button onClick={() => setEditingPage(page)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">Editar</button>
                                                <button onClick={() => deletePage(page.id).then(loadData)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {pages.length === 0 && <div className="p-8 text-center text-gray-500">Nenhuma página criada.</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">{editingPost.id ? 'Editar Post' : 'Novo Post'}</h2>
                                <form onSubmit={handleSavePost} className="grid gap-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                                            <input name="title" required defaultValue={editingPost.title} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                                            <input name="slug" required defaultValue={editingPost.slug} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Resumo Opcional (Excerpt)</label>
                                        <textarea name="excerpt" defaultValue={editingPost.excerpt} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Imagem Principal (URL)</label>
                                        <input name="cover_image" defaultValue={editingPost.cover_image} type="url" className="w-full rounded-lg border border-gray-300 px-3 py-2" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo (Markdown)</label>
                                        <textarea name="content" required defaultValue={editingPost.content} rows={15} className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" name="is_published" id="post_published" defaultChecked={editingPost.is_published} className="rounded border-gray-300" />
                                        <label htmlFor="post_published" className="text-sm font-medium text-gray-700">Publicado</label>
                                    </div>
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button type="button" onClick={() => setEditingPost(null)} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                                        <button type="submit" className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2 text-sm font-semibold text-white hover:bg-primary/90">
                                            <Save className="h-4 w-4" /> Guardar Post
                                        </button>
                                    </div>
                                </form>
                            </div>
                        ) : (
                            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                                <div className="divide-y">
                                    {posts.map(post => (
                                        <div key={post.id} className="p-4 hover:bg-gray-50 transition-colors flex justify-between items-center">
                                            <div>
                                                <h3 className="font-bold text-gray-900">{post.title}</h3>
                                                <p className="text-sm text-gray-500 mb-1">/blog/{post.slug}</p>
                                                <div className="flex items-center gap-3">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${post.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                                        {post.is_published ? 'Publicado' : 'Rascunho'}
                                                    </span>
                                                    <span className="text-xs text-gray-500">{post.views || 0} visualizações</span>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <Link href={`/blog/${post.slug}`} target="_blank" className="p-2 text-accent hover:bg-accent/10 rounded-lg">Ver</Link>
                                                <button onClick={() => setEditingPost(post)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">Editar</button>
                                            </div>
                                        </div>
                                    ))}
                                    {posts.length === 0 && <div className="p-8 text-center text-gray-500">Nenhum post criado.</div>}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
