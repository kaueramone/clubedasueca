export const bannerTemplates = {
  classic: { name: 'Clássico', description: 'Verde e dourado para a comunicação do clube.' },
  informational: { name: 'Informativo', description: 'Azul discreto para avisos e novidades.' },
  promotional: { name: 'Promocional', description: 'Tons quentes para eventos e campanhas.' },
} as const

export type BannerTemplate = keyof typeof bannerTemplates
export type BannerContent = {
  title: string; description: string | null; template: BannerTemplate | 'image'
  link_url: string | null; cta_label: string | null
  image_url?: string | null; mobile_image_url?: string | null
}
export type Banner = BannerContent & {
  id: string; is_active: boolean; start_date: string | null; end_date: string | null
  clicks: number; impressions: number
}

export function safeBannerLink(value: string | null | undefined): string | null {
  const link = value?.trim()
  if (!link || link.length > 2048 || /[\\\u0000-\u0020]/.test(link)) return null
  try {
    const url = new URL(link, 'https://clubedasueca.co.mz')
    if (link.startsWith('/') && !link.startsWith('//') && url.origin === 'https://clubedasueca.co.mz') return link
    if (link.startsWith('https://') && url.protocol === 'https:' && !url.username && !url.password) return link
  } catch { /* Invalid links are never rendered or saved. */ }
  return null
}

export function validateBanner(input: Record<string, unknown>) {
  const title = typeof input.title === 'string' ? input.title.trim() : ''
  const description = typeof input.description === 'string' ? input.description.trim() : ''
  const template = input.template
  if (typeof template !== 'string' || (template !== 'image' && !Object.hasOwn(bannerTemplates, template))) return { error: 'Selecione um dos modelos disponíveis.' }
  if (!title || title.length > 100) return { error: 'O título deve ter entre 1 e 100 caracteres.' }
  if (description.length > 500) return { error: 'A descrição pode ter até 500 caracteres.' }
  const rawLink = typeof input.link_url === 'string' ? input.link_url.trim() : ''
  const link = safeBannerLink(rawLink)
  if (rawLink && !link) return { error: 'Use um endereço HTTPS ou um caminho interno, como /dashboard/play.' }
  const cta = typeof input.cta_label === 'string' ? input.cta_label.trim() : ''
  if (link && (!cta || cta.length > 40)) return { error: 'Indique o texto do botão, até 40 caracteres.' }
  if (!link && cta) return { error: 'Indique o destino do botão ou remova o seu texto.' }
  const start = input.start_date ? new Date(String(input.start_date)) : null
  const end = input.end_date ? new Date(String(input.end_date)) : null
  if ((start && !Number.isFinite(start.getTime())) || (end && !Number.isFinite(end.getTime()))) return { error: 'Indique datas válidas.' }
  if (end && end.getTime() <= (start?.getTime() ?? Date.now())) return { error: 'A data de fim deve ser posterior ao início.' }
  return { data: {
    title, description: description || null, template: template as BannerContent['template'],
    link_url: link, cta_label: link ? cta : null,
    start_date: start?.toISOString() ?? null, end_date: end?.toISOString() ?? null,
  } }
}
