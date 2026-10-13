import { BI_MAX_BYTES } from './identity-document'

async function preparePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024 || file.size === 0)
    throw new Error('Escolha uma fotografia JPG, PNG ou WebP até 20 MB.')
  const image = await createImageBitmap(file)
  try {
    const scale = Math.min(1, 2200 / Math.max(image.width, image.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale)
    const context = canvas.getContext('2d')!
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('Fotografia inválida.')), 'image/jpeg', 0.88))
    if (blob.size > BI_MAX_BYTES) throw new Error('A fotografia continua demasiado grande. Use uma imagem mais pequena.')
    return blob
  } finally { image.close() }
}
export async function prepareIdentityPhotos(front: File, back: File | null) {
  return Promise.all((back ? [front, back] : [front]).map(preparePhoto))
}
