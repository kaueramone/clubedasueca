export const BI_CONSENT_VERSION = 'bi-storage-gemini-2026-10-13'
export const BI_MAX_BYTES = 2 * 1024 * 1024
export const DOCUMENT_TYPES = { id: 'Bilhete de Identidade', passport: 'Passaporte', citizen_card: 'Cartão de Cidadão', residence_permit: 'Título de residência' } as const
export type DocumentType = keyof typeof DOCUMENT_TYPES
export type IdentityFields = {
  full_name: string; document_number: string; birth_date: string; expiry_date: string
  country: string; document_type: string
  photo_present: boolean
}
export type IdentityRecord = IdentityFields & {
  revision: string; submitted_at: string; authenticity_verified: false
  front_url: string; back_url: string | null; expired: boolean
  credit_error?: string | null
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
  if (!input || typeof input !== 'object') throw new Error('Dados do documento inválidos.')
  const data = input as Record<string, unknown>
  if (typeof data.country !== 'string' || !/^[A-Z]{3}$/.test(data.country) || data.country === 'UNK') throw new Error('Não foi possível identificar o país emissor.')
  if (typeof data.document_type !== 'string' || !Object.hasOwn(DOCUMENT_TYPES, data.document_type)) throw new Error('Use BI, passaporte, Cartão de Cidadão ou título de residência.')
  if (data.photo_present !== true) throw new Error('O documento deve apresentar uma fotografia do titular legível.')
  const name = typeof data.full_name === 'string' ? data.full_name.trim() : ''
  const number = typeof data.document_number === 'string' ? data.document_number.trim() : ''
  if (name.length < 2 || name.length > 200 || !/^[\p{L}\p{M} .,'’\-]+$/u.test(name)) throw new Error('O nome não foi lido corretamente. Repita as fotografias.')
  if (!/^[A-Za-z0-9 /-]{5,40}$/.test(number)) throw new Error('O número do documento não foi lido corretamente.')
  if (!isCalendarDate(data.birth_date) || data.birth_date >= today || data.birth_date < '1900-01-01') throw new Error('A data de nascimento não foi lida corretamente.')
  if (!isAdult(data.birth_date, today)) throw new Error('É necessário ter pelo menos 18 anos, conforme a data de nascimento no documento.')
  if (!isCalendarDate(data.expiry_date)) throw new Error('Não foi possível ler a data de validade. Repita as fotografias.')
  if (data.expiry_date < today) throw new Error('Este documento está expirado. Importe um documento dentro da validade.')
  if (data.expiry_date <= data.birth_date || data.expiry_date > '2200-01-01') throw new Error('Data de validade inválida.')
  return { full_name: name, document_number: number, birth_date: data.birth_date, expiry_date: data.expiry_date, country: data.country, document_type: data.document_type, photo_present: true }
}

export function isAdult(birthDate: string, today = mozambiqueToday()) {
  return isCalendarDate(birthDate) && birthDate <= `${Number(today.slice(0, 4)) - 18}${today.slice(4)}`
}

// Require all meaningful name parts; tolerate accents, punctuation, order and Portuguese connectors.
export function normalizedIdentityName(name: string) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s]/g, ' ')
    .split(/\s+/).filter(word => word && !['da', 'das', 'de', 'do', 'dos', 'e'].includes(word)).sort().join(' ')
}
export function identityNamesMatch(documentName: string, profileName: string) {
  const document = normalizedIdentityName(documentName)
  return document.split(' ').length >= 2 && document === normalizedIdentityName(profileName)
}
