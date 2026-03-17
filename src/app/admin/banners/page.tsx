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
        if (result.error) setMessage(`❌ ${result.error}`)
        else { setMessage('✅ Banner criado com sucesso!'); setShowCreate(false); loadData() }
    }

    async function handleToggleStatus(id: string, currentStatus: boolean) {
        const result = await updateBanner(id, { is_active: !currentStatus })
        if (result.error) setMessage(`❌ ${result.error}`)
        else { loadData() }
    }

    async function handleDelete(id: string) {
        if (!confirm('Deseja mesmo eliminar este banner?')) return
        const result = await deleteBanner(id)
        if (result.error) setMessage(`❌ ${result.error}`)
        else { setMessage('✅ Banner eliminado'); loadData() }
    }

    if (loading) return <div className="flex items-center justify-center py-20 text-muted-foreground">A carregar...</div>

    return (
        <div className="min-h-screen bg-background p-4 md:p-8">
            <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <Link href="/admin" className="text-sm text-accent hover:underline">← Admin</Link>
                        <h1 className="text-2xl font-bold text-foreground mt-1">🖼️ Gestão de Banners</h1>
                    </div>
                    <button onClick={() => setShowCreate(!showCreate)}
                        className="flex items-center gap-2 rounded-xl bg-accent/90 px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors">
                        <Plus className="h-4 w-4" /> Novo Banner
                    </button>
                </div>

                {message && (
                    <div className="rounded-xl bg-accent/10 border border-accent/30 p-3 text-sm text-accent">
                        {message} <button onClick={() => setMessage('')} className="ml-2 font-bold">×</button>
                    </div>
                )}

                {showCreate && (
                    <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
                        <h2 className="text-lg font-bold text-foreground mb-4">Criar Novo Banner</h2>
                        <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Título *</label>
                                <input name="title" required className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground" placeholder="Ex: Mega Torneio Fim de Semana" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Link de Destino</label>
                                <input name="link_url" type="url" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground" placeholder="https://..." />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Descrição</label>
                                <input name="description" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground" placeholder="Participe já e ganhe 500€ em bónus..." />
                            </div>
                            <div className="md:col-span-2 grid gap-4 grid-cols-1 md:grid-cols-2 p-4 bg-background rounded-xl border border-border">
                                <div className="space-y-3">
                                    <h3 className="font-semibold text-foreground border-b pb-2">Imagem Desktop (800x200px)</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                                            Enviar Arquivo
                                        </label>
                                        <input name="image_file" type="file" accept="image/*" className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20" />
                                    </div>
                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-border"></div>
                                        <span className="flex-shrink-0 mx-4 text-muted-foreground/70 text-xs uppercase font-medium">Ou URL da Imagem</span>
                                        <div className="flex-grow border-t border-border"></div>
                                    </div>
                                    <div>
                                        <input name="image_url" type="url" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground" placeholder="https://exemplo.com/banner-desktop.png" />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-semibold text-foreground border-b pb-2">Imagem Mobile (400x200px)</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                                            Enviar Arquivo
                                        </label>
                                        <input name="mobile_image_file" type="file" accept="image/*" className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-accent/10 file:text-accent hover:file:bg-accent/20" />
                                    </div>
                                    <div className="relative flex items-center py-2">
                                        <div className="flex-grow border-t border-border"></div>
                                        <span className="flex-shrink-0 mx-4 text-muted-foreground/70 text-xs uppercase font-medium">Ou URL da Imagem</span>
                                        <div className="flex-grow border-t border-border"></div>
                                    </div>
                                    <div>
                                        <input name="mobile_image_url" type="url" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground" placeholder="https://exemplo.com/banner-mobile.png" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Data de Início</label>
                                <input name="start_date" type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground/80 mb-1">Data de Fim (opcional)</label>
                                <input name="end_date" type="datetime-local" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground font-medium placeholder:text-muted-foreground" />
                            </div>
                            <div className="md:col-span-2 flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowCreate(false)}
                                    className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Cancelar</button>
                                <button type="submit"
                                    className="rounded-lg bg-accent/90 px-6 py-2 text-sm font-semibold text-white hover:bg-accent/90">Criar Banner</button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="rounded-2xl bg-card shadow-sm border border-border overflow-hidden">
                    <div className="border-b bg-background px-6 py-4">
                        <h2 className="font-semibold text-foreground/80 flex items-center gap-2">
                            <ImageIcon className="h-5 w-5" /> Todos os Banners ({banners.length})
                        </h2>
                    </div>
                    <div className="divide-y">
                        {banners.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">Nenhum banner criado.</div>
                        ) : (
                            banners.map(banner => (
                                <div key={banner.id} className="p-4 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            {banner.image_url ? (
                                                <div
                                                    className="w-16 h-10 rounded bg-cover bg-center border border-border"
                                                    style={{ backgroundImage: `url(${banner.image_url})` }}
                                                />
                                            ) : (
                                                <div className="w-16 h-10 rounded bg-muted flex items-center justify-center border border-border text-muted-foreground/70">
                                                    <ImageIcon className="h-6 w-6" />
                                                </div>
                                            )}
                                            <div>
                                                <h3 className="font-bold text-foreground">{banner.title}</h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${banner.is_active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                                                        }`}>{banner.is_active ? 'Ativo' : 'Pausado'}</span>
                                                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded-full">{banner.position}</span>
                                                    <span className="text-xs text-accent px-2 py-0.5 bg-accent/10 rounded-full">{banner.target_segment}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleToggleStatus(banner.id, banner.is_active)}
                                                className={`p-2 rounded-lg transition-colors ${banner.is_active ? 'text-yellow-600 hover:bg-yellow-500/10' : 'text-green-600 hover:bg-success/10'
                                                    }`} title={banner.is_active ? 'Pausar' : 'Ativar'}>
                                                {banner.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                            </button>
                                            <button onClick={() => handleDelete(banner.id)}
                                                className="p-2 rounded-lg text-red-600 hover:bg-destructive/10" title="Eliminar">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Stats Row */}
                                    <div className="grid grid-cols-3 gap-4 rounded-xl bg-background p-3 mt-2 border border-border/50">
                                        <div className="flex items-center gap-2">
                                            <Eye className="h-4 w-4 text-muted-foreground/70" />
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Impressões</p>
                                                <p className="font-semibold text-foreground leading-tight">{banner.stats?.impressions || 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MousePointer2 className="h-4 w-4 text-blue-400" />
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">Cliques</p>
                                                <p className="font-semibold text-accent leading-tight">{banner.stats?.clicks || 0}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Percent className="h-4 w-4 text-green-400" />
                                            <div>
                                                <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">CTR</p>
                                                <p className="font-semibold text-green-700 leading-tight">{banner.stats?.ctr || '0.00'}%</p>
                                            </div>
                                        </div>
                                    </div>

                                    {banner.end_date && (
                                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground/70">
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
