export const BI_CONSENT_VERSION = 'bi-storage-2026-10-13'
export const BI_MAX_BYTES = 2 * 1024 * 1024
export type IdentityFields = {
  full_name: string; document_number: string; birth_date: string; expiry_date: string
  country: string; document_type: string
}
export type IdentityRecord = IdentityFields & {
  revision: string; submitted_at: string; authenticity_verified: false
  front_url: string; back_url: string; expired: boolean
}
export function mozambiqueToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Africa/Maputo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  return `${part('year')}-${part('month')}-${part('day')}`
}
export function isCalendarDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value
}
export function validateIdentityFields(input: unknown, today = mozambiqueToday()): IdentityFields {
  if (!input || typeof input !== 'object') throw new Error('Dados do BI inválidos.')
  const data = input as Record<string, unknown>
  if (data.country !== 'MOZ' || data.document_type !== 'id') throw new Error('Importe um Bilhete de Identidade de Moçambique.')
  const name = typeof data.full_name === 'string' ? data.full_name.trim() : ''
  const number = typeof data.document_number === 'string' ? data.document_number.trim() : ''
  if (name.length < 2 || name.length > 200 || !/^[\p{L}\p{M} .,'’\-]+$/u.test(name)) throw new Error('O nome não foi lido corretamente. Repita as fotografias.')
  if (!/^[A-Za-z0-9 /-]{5,40}$/.test(number)) throw new Error('O número do BI não foi lido corretamente.')
  if (!isCalendarDate(data.birth_date) || data.birth_date >= today || data.birth_date < '1900-01-01') throw new Error('A data de nascimento não foi lida corretamente.')
  if (!isCalendarDate(data.expiry_date)) throw new Error('Não foi possível ler a data de validade. Repita as fotografias.')
  if (data.expiry_date < today) throw new Error('Este BI está expirado. Importe um documento dentro da validade.')
  if (data.expiry_date <= data.birth_date || data.expiry_date > '2200-01-01') throw new Error('Data de validade inválida.')
  return { full_name: name, document_number: number, birth_date: data.birth_date, expiry_date: data.expiry_date, country: 'MOZ', document_type: 'id' }
}
