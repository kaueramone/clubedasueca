'use client'

import { useEffect, useState } from 'react'
import { getAllBanners, createBanner, updateBanner, deleteBanner, getBannerStats } from '@/features/banners/actions'
import { Image as ImageIcon, Plus, Eye, MousePointer2, Percent, Calendar, Trash2, Edit2, Play, Pause } from 'lucide-react'
import Link from 'next/link'

export default function AdminBannersPage() {
    const [banners, setBanners] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showCreate, setShowCreate] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => { loadData() }, [])

    async function loadData() {
        setLoading(true)
        const result = await getAllBanners()
        if (result.banners) {
            // Get stats for each
            const withStats = await Promise.all(
                result.banners.map(async (b: any) => {
                    const stats = await getBannerStats(b.id)
                    return { ...b, stats }
                })
            )
            setBanners(withStats)
        }
        setLoading(false)
    }

    async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const result = await createBanner(new FormData(e.currentTarget))
        if (result.error) setMessage(`âŒ ${result.error}`)
        else { setMessage('âœ… Banner criado com sucesso!'); setShowCreate(false); loadData() }
    }

    async function handleToggleStatus(id: string, currentStatus: boolean) {
        const result = await updateBanner(id, { is_active: !currentStatus })
        if (result.error) setMessage(`âŒ ${result.error}`)
        else { loadData() }
    }

    async function handleDelete(id: string) {
        if (!confirm('Deseja mesmo eliminar este banner?')) return
        const result = await deleteBanner(id)
        if (result.error) setMessage(`âŒ ${result.error}`)
        else { setMessage('âœ… Banner eliminado'); loadData() }
    }

    if (loading) return <div className="flex items-center justify-center py-20 text-gray-500">A carregar...</div>

    return (
        <div className="min-h-screen bg-gray-50 p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/admin" className="text-sm text-accent hover:underline">â† Admin</Link>
                        <h1 className="text-2xl font-bold text-gray-900 mt-1">ðŸ–¼ï¸ GestÃ£o de Banners</h1>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 rounded-xl bg-accent/90 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors">
                        <Plus className="h-4 w-4" /> Novo Banner
                    </button>
                </div>

                {message && (
                    <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm text-blue-700">
                        {message} <button onClick={() => setMessage('')} className="ml-2 font-bold">Ã—</button>
                    </div>
                )}

                {showCreate && (
                    <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Criar Novo Banner</h2>
                        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">TÃ­tulo *</label>
                                <input name="title" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700" placeholder="Ex: Mega Torneio Fim de Semana" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">PosiÃ§Ã£o</label>
                                <select name="position" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700">
                                    <option value="dashboard_top">Dashboard (Topo)</option>
                                    <option value="hero">Hero (Landing Page)</option>
                                    <option value="sidebar">Sidebar</option>
                                    <option value="game_lobby">Game Lobby</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">DescriÃ§Ã£o</label>
                                <input name="description" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700" placeholder="Participe jÃ¡ e ganhe 500â‚¬ em bÃ³nus..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">URL da Imagem (opcional)</label>
                                <input name="image_url" type="url" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700" placeholder="https://exemplo.com/banner.png" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Link de Destino</label>
                                <input name="link_url" type="url" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700" placeholder="https://..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Segmento Alvo</label>
                                <select name="target_segment" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700">
                                    <option value="all">Todos os Utilizadores</option>
                                    <option value="new">Novos (S/ DepÃ³sito)</option>
                                    <option value="vip">Apenas VIPs</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridade (Maior = Antes)</label>
                                <input name="priority" type="number" defaultValue="0" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data de InÃ­cio</label>
                                <input name="start_date" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Fim (opcional)</label>
                                <input name="end_date" type="datetime-local" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 font-bold placeholder:text-gray-700" />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowCreate(false)}
                                    className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">Cancelar</button>
                                <button type="submit"
                                    className="rounded-lg bg-accent/90 px-6 py-2 text-sm font-semibold text-white hover:bg-blue-700">Criar Banner</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
                    <div className="border-b bg-gray-50 px-6 py-4">
                        <h2 className="font-semibold text-gray-700 flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" /> Todos os Banners ({banners.length})
                        </h2>
                    </div>
                    <div className="divide-y">
                        {banners.length === 0 ? (
                            <div className="py-12 text-center text-gray-500">Nenhum banner criado.</div>
                        ) : (
                            banners.map(banner => (
                                <div key={banner.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {banner.image_url ? (
                                                <div
                                                    className="w-16 h-10 rounded bg-cover bg-center border border-gray-200"
                                                    style={{ backgroundImage: `url(${banner.image_url})` }}
                                                />
                                            ) : (
                                                <div className="w-16 h-10 rounded bg-gray-100 flex items-center justify-center border border-gray-200 text-gray-400">
                                                    <ImageIcon className="h-6 w-6" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-gray-900">{banner.title}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${banner.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                                                        }`}>{banner.is_active ? 'Ativo' : 'Pausado'}</span>
                                                    <span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded-full">{banner.position}</span>
                                                    <span className="text-xs text-accent px-2 py-0.5 bg-accent/10 rounded-full">{banner.target_segment}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleToggleStatus(banner.id, banner.is_active)}
                                                className={`p-2 rounded-lg transition-colors ${banner.is_active ? 'text-yellow-600 hover:bg-yellow-50' : 'text-green-600 hover:bg-green-50'
                                                    }`} title={banner.is_active ? 'Pausar' : 'Ativar'}>
                                                {banner.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => handleDelete(banner.id)}
                                                className="p-2 rounded-lg text-red-600 hover:bg-red-50" title="Eliminar">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-4 rounded-xl bg-gray-50 p-3 mt-2 border border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-gray-400" />
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-500 leading-none">ImpressÃµes</p>
                                                <p className="font-semibold text-gray-900 leading-tight">{banner.stats?.impressions || 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MousePointer2 className="h-4 w-4 text-blue-400" />
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-500 leading-none">Cliques</p>
                                                <p className="font-semibold text-blue-700 leading-tight">{banner.stats?.clicks || 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Percent className="h-4 w-4 text-green-400" />
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-gray-500 leading-none">CTR</p>
                                                <p className="font-semibold text-green-700 leading-tight">{banner.stats?.ctr || '0.00'}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    {banner.end_date && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                                            <Calendar className="h-3 w-3" /> Termina a {new Date(banner.end_date).toLocaleDateString('pt-PT')}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
