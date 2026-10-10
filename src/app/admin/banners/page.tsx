'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getAllBanners, updateBanner, deleteBanner } from '@/features/banners/actions'
import { BannerEditor } from '@/features/banners/banner-editor'
import { BannerCard } from '@/features/banners/banner-card'
import { bannerTemplates, type Banner } from '@/features/banners/model'

function schedule(banner: Banner) {
  if (!banner.is_active) return 'Pausado'
  const now = Date.now()
  if (banner.end_date && new Date(banner.end_date).getTime() <= now) return 'Terminado'
  if (banner.start_date && new Date(banner.start_date).getTime() > now) return 'Agendado'
  return 'Ativo'
}

export default function AdminBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [editor, setEditor] = useState<Banner | 'new' | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAllBanners()
      if (result.error) setMessage(result.error)
      else setBanners(result.banners || [])
    } catch { setMessage('Não foi possível carregar os banners. Tente atualizar a lista.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void loadData() }, [loadData])

  async function mutate(banner: Banner, remove: boolean) {
    if (busy) return
    if (remove && !confirm('Eliminar o banner “' + banner.title + '”?')) return
    setBusy(banner.id); setMessage('')
    try {
      const result = remove ? await deleteBanner(banner.id) : await updateBanner(banner.id, { is_active: !banner.is_active })
      if (result.error) setMessage(result.error)
      else {
        setMessage(remove ? 'Banner eliminado.' : 'Estado atualizado.')
        await loadData()
      }
    } catch { setMessage('Não foi possível confirmar a alteração. Atualize a lista antes de repetir.') }
    finally { setBusy(null) }
  }

  return <div className="min-h-screen bg-background p-4 md:p-8">
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-accent hover:underline">← Administração</Link>
          <h1 className="text-2xl font-bold mt-1">Gestão de banners</h1>
          <p className="mt-2 text-sm text-muted-foreground">Comunique novidades na página inicial com três modelos de fundo e texto que se adapta ao ecrã.</p>
        </div>
        <button disabled={!!busy} onClick={() => { setEditor('new'); setMessage('') }} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">Novo banner</button>
      </header>
      {message && <p role="status" className="rounded-xl border border-border bg-card p-4 text-sm">{message}</p>}
      {editor && <BannerEditor key={editor === 'new' ? 'new' : editor.id} banner={editor === 'new' ? undefined : editor}
        onCancel={() => setEditor(null)} onSaved={() => { setEditor(null); setMessage('Banner guardado.'); void loadData() }} />}
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">Banners existentes</h2>
        <button disabled={loading || !!busy} onClick={() => void loadData()} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Atualizar lista</button>
      </div>
      {loading ? <p role="status" className="py-8 text-muted-foreground">A carregar…</p> : banners.length === 0
        ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">Ainda não há banners. Crie o primeiro escolhendo um modelo.</p>
        : <div className="grid gap-6 lg:grid-cols-2">{banners.map(banner => <article key={banner.id} className="min-w-0 rounded-2xl border border-border bg-card p-4 space-y-4">
          <BannerCard banner={banner} preview />
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{banner.template && banner.template !== 'image' ? bannerTemplates[banner.template]?.name : 'Imagem existente'} · {schedule(banner)}</span>
            <span>{banner.clicks || 0} cliques</span>
          </div>
          {banner.template === 'image' && <p className="text-xs text-muted-foreground">Use Editar para converter esta imagem num dos modelos responsivos.</p>}
          {banner.end_date && <p className="text-xs text-muted-foreground">Fim: {new Date(banner.end_date).toLocaleString('pt-MZ')}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={!!busy} onClick={() => { setEditor(banner); setMessage(''); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">Editar</button>
            <button disabled={!!busy} onClick={() => void mutate(banner, false)} className="rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50">{busy === banner.id ? 'A atualizar…' : banner.is_active ? 'Pausar' : 'Ativar'}</button>
            <button disabled={!!busy} onClick={() => void mutate(banner, true)} className="rounded-lg border border-red-400/40 px-3 py-2 text-sm text-red-400 disabled:opacity-50">Eliminar</button>
          </div>
        </article>)}</div>}
    </div>
  </div>
}
