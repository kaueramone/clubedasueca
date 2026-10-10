'use client'

import { useEffect, useState } from 'react'
import { getActiveBanners, trackBannerClick } from '@/features/banners/actions'
import { BannerCard } from '@/features/banners/banner-card'
import type { Banner } from '@/features/banners/model'

export function BannerDisplay({ position = 'dashboard_top' }: { position?: string }) {
  const [banners, setBanners] = useState<Banner[]>([])
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  useEffect(() => {
    let cancelled = false
    getActiveBanners(position).then(result => {
      if (!cancelled && result.banners) { setBanners(result.banners); setIndex(0) }
    }).catch(() => { /* Banners do not block access to the dashboard. */ })
    return () => { cancelled = true }
  }, [position])
  useEffect(() => {
    if (banners.length < 2 || paused || hovered || focused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setIndex(value => (value + 1) % banners.length), 10000)
    return () => clearInterval(timer)
  }, [banners.length, paused, hovered, focused])
  if (!banners.length) return null
  return <section className="min-w-0 w-full self-start" aria-label="Informações do clube" aria-roledescription="carrossel"
    onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
    onFocusCapture={() => setFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false) }}>
    <div className="grid min-w-0">
      {banners.map((banner, slide) => <div key={banner.id} style={{ gridArea: '1 / 1' }}
        className={`min-w-0 ${slide === index ? 'visible' : 'invisible pointer-events-none'}`}
        aria-hidden={slide !== index} inert={slide !== index}>
        <BannerCard banner={banner} onFollow={() => { void trackBannerClick(banner.id).catch(() => {}) }} />
      </div>)}
    </div>
    {banners.length > 1 && <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
      {banners.map((banner, slide) => <button key={banner.id} type="button"
        onClick={() => { setIndex(slide); setPaused(true) }} aria-label={`Mostrar banner ${slide + 1}: ${banner.title}`}
        aria-current={slide === index ? 'true' : undefined}
        className={`h-8 min-w-8 rounded-full border border-border text-xs ${slide === index ? 'bg-primary text-white' : 'bg-card text-foreground'}`}>{slide + 1}</button>)}
      <button type="button" onClick={() => setPaused(value => !value)} className="min-h-8 px-2 text-xs underline">
        {paused ? 'Retomar rotação' : 'Pausar rotação'}
      </button>
    </div>}
  </section>
}
