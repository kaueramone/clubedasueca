'use client'

import { useState } from 'react'
import { saveBanner } from './actions'
import { BannerCard } from './banner-card'
import { bannerTemplates, type Banner, type BannerContent } from './model'

function localDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function BannerEditor({ banner, onSaved, onCancel }: {
  banner?: Banner; onSaved: () => void; onCancel: () => void
}) {
  const [template, setTemplate] = useState<BannerContent['template']>(banner?.template || (banner ? 'image' : 'classic'))
  const [title, setTitle] = useState(banner?.title || '')
  const [description, setDescription] = useState(banner?.description || '')
  const [link, setLink] = useState(banner?.link_url || '')
  const [cta, setCta] = useState(banner?.cta_label || (banner?.link_url ? 'Saiba mais' : ''))
  const [mobile, setMobile] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const inputClass = 'block w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground'
  const preview: BannerContent = { ...banner, template, title: title || 'O título aparece aqui', description: description || null, link_url: link, cta_label: cta || 'Saiba mais' }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setError('')
    try {
      for (const field of ['start_date', 'end_date']) {
        const value = String(form.get(field) || '')
        if (value) form.set(field, new Date(value).toISOString())
      }
      const result = await saveBanner(banner?.id || null, form)
      if (result.error) setError(result.error)
      else onSaved()
    } catch { setError('Não foi possível confirmar a gravação. Atualize a lista antes de repetir.') }
    finally { setBusy(false) }
  }

  return <section className="rounded-2xl bg-card border border-border p-4 sm:p-6 space-y-5">
    <h2 className="text-lg font-bold">{banner ? 'Editar banner' : 'Novo banner'}</h2>
    {error && <p role="alert" className="rounded-lg border border-red-400 p-3 text-sm">{error}</p>}
    <form onSubmit={submit} className="space-y-5">
      <fieldset disabled={busy} className="space-y-5 min-w-0">
        <legend className="mb-2 text-sm font-semibold">Modelo de fundo</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {Object.entries(bannerTemplates).map(([value, option]) => <label key={value}
            className={`cursor-pointer rounded-xl border p-4 ${template === value ? 'border-accent bg-accent/5' : 'border-border'}`}>
            <span className="flex items-center gap-2 font-semibold text-sm">
              <input type="radio" name="template" value={value} checked={template === value} onChange={() => setTemplate(value as BannerContent['template'])} />
              {option.name}
            </span>
            <span aria-hidden="true" className={`block h-10 rounded-lg my-3 ${value === 'classic' ? 'bg-gradient-to-r from-[#0b3026] to-[#267252]' : value === 'informational' ? 'bg-gradient-to-r from-[#142a47] to-[#295d91]' : 'bg-gradient-to-r from-[#481b39] to-[#913a45]'}`} />
            <span className="text-xs text-muted-foreground">{option.description}</span>
          </label>)}
        </div>
        {banner?.image_url && <label className="flex gap-2 text-xs text-muted-foreground">
          <input type="radio" name="template" value="image" checked={template === 'image'} onChange={() => setTemplate('image')} />
          Manter a imagem existente
        </label>}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm sm:col-span-2">Título <span className="text-muted-foreground">({title.length}/100)</span>
            <input className={inputClass} name="title" required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Uma novidade para a comunidade" />
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">Descrição <span className="text-muted-foreground">({description.length}/500)</span>
            <textarea className={inputClass} name="description" maxLength={500} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Explique a informação que quer partilhar." />
          </label>
          <label className="space-y-1 text-sm">Texto do botão (opcional)
            <input className={inputClass} name="cta_label" maxLength={40} value={cta} onChange={e => setCta(e.target.value)} placeholder="Saber mais" />
          </label>
          <label className="space-y-1 text-sm">Destino do botão
            <input className={inputClass} name="link_url" maxLength={2048} value={link} onChange={e => setLink(e.target.value)} placeholder="/dashboard/play ou https://…" />
          </label>
          <label className="space-y-1 text-sm">Início (opcional)
            <input className={inputClass} name="start_date" type="datetime-local" defaultValue={localDate(banner?.start_date)} />
          </label>
          <label className="space-y-1 text-sm">Fim (opcional)
            <input className={inputClass} name="end_date" type="datetime-local" defaultValue={localDate(banner?.end_date)} />
          </label>
        </div>
        <div className="rounded-xl border border-border bg-background p-3 sm:p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-sm">Prévia do banner</p>
            <div className="flex gap-2 text-xs">
              <button type="button" aria-pressed={mobile} onClick={() => setMobile(true)} className={`rounded px-3 py-2 border ${mobile ? 'border-accent' : 'border-border'}`}>Telemóvel</button>
              <button type="button" aria-pressed={!mobile} onClick={() => setMobile(false)} className={`rounded px-3 py-2 border ${!mobile ? 'border-accent' : 'border-border'}`}>Computador</button>
            </div>
          </div>
          <div className="mx-auto w-full" style={{ maxWidth: mobile ? 320 : 760 }}><BannerCard banner={preview} preview /></div>
          {template === 'image' && <p className="text-xs text-muted-foreground">Selecione um dos três modelos para mostrar o título e a descrição como texto responsivo.</p>}
        </div>
      </fieldset>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm">Cancelar</button>
        <button type="submit" disabled={busy} className="rounded-lg bg-primary px-5 py-2 text-white text-sm font-semibold disabled:opacity-50">{busy ? 'A guardar…' : 'Guardar banner'}</button>
      </div>
    </form>
  </section>
}
