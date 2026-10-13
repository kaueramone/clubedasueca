import type { BlinkIdScanningResult, DateResult, StringResult } from '@microblink/blinkid-core'
import { BI_MAX_BYTES, validateIdentityFields } from './identity-document'

const readText = (field?: StringResult) => field?.latin?.value || ''
function readDate(field?: DateResult<StringResult>) {
  return field?.successfullyParsed && field.year && field.month && field.day
    ? `${field.year}-${String(field.month).padStart(2, '0')}-${String(field.day).padStart(2, '0')}` : ''
}
export function extractIdentityFields(result: BlinkIdScanningResult) {
  if (result.dataMatchResult?.overallState === 'failed') throw new Error('Os dados da frente e do verso não coincidem. Fotografe as duas faces do mesmo BI.')
  return validateIdentityFields({
    full_name: readText(result.fullName) || [readText(result.firstName), readText(result.lastName)].filter(Boolean).join(' '),
    document_number: readText(result.documentNumber), birth_date: readDate(result.dateOfBirth), expiry_date: readDate(result.dateOfExpiry),
    country: result.documentClassInfo?.isoAlpha3CountryCode || (result.documentClassInfo?.country?.id === 'mozambique' ? 'MOZ' : ''),
    document_type: result.documentClassInfo?.documentType?.id,
  })
}
async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024 || file.size === 0)
    throw new Error('Escolha uma fotografia JPG, PNG ou WebP até 20 MB.')
  const image = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 2200 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext('2d', { willReadFrequently: true })!
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Fotografia inválida.')), 'image/jpeg', 0.88))
    if (blob.size > BI_MAX_BYTES) throw new Error('A fotografia continua demasiado grande. Use uma imagem mais pequena.')
    return { blob, pixels: context.getImageData(0, 0, canvas.width, canvas.height) }
  } finally { image.close() }
}
export async function readIdentityDocument(front: File, back: File, licenseKey: string, progress: (message: string) => void, cancelled: () => boolean) {
  const photos = await Promise.all([preparePhoto(front), preparePhoto(back)])
  if (cancelled()) throw new Error('Leitura cancelada.')
  const { loadBlinkIdCore } = await import('@microblink/blinkid-core')
  const core = await loadBlinkIdCore({ licenseKey,
    resourcesLocation: `${location.origin}/ensaios/blinkid/sdk/`, useLightweightBuild: true,
    otaResources: { checkForUpdates: false },
  }, value => { if (!cancelled()) progress(`A carregar o leitor… ${Math.round(value.progress)}%`) })
  try {
    if (cancelled()) throw new Error('Leitura cancelada.')
    const session = await core.createScanningSession(await core.buildDocumentPhotoSettings())
    try {
      for (let i = 0; i < photos.length; i++) {
        if (cancelled()) throw new Error('Leitura cancelada.')
        progress(i === 0 ? 'A ler a frente do BI…' : 'A ler o verso do BI…')
        const processed = await session.process(photos[i].pixels)
        if ('error' in processed) throw new Error('Não foi possível ler a fotografia. Repita com boa luz e sem reflexos.')
        const state = await session.getScanningStatus()
        if (state === 'document-scanned') break
        if (state === 'side-scanned') await session.resolveCurrentStep()
      }
      if (await session.getScanningStatus() !== 'document-scanned') throw new Error('Leitura incompleta. Repita as duas fotografias, mostrando o BI por inteiro.')
      const fields = extractIdentityFields(await session.getResult())
      return { fields, photos: photos.map(photo => photo.blob) }
    } finally { await session.delete() }
  } finally { await core.terminate() }
}
