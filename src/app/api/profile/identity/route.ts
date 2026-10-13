import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { BI_CONSENT_VERSION, BI_MAX_BYTES, mozambiqueToday, validateIdentityFields } from '@/lib/identity-document'
import { extractIdentityDocument } from '@/lib/extract-identity-document'

export const runtime = 'nodejs'
export const maxDuration = 60
const bucket = 'identity-documents'
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie', 'X-Content-Type-Options': 'nosniff' } })
}
async function authenticate() {
  const client = await createClient()
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user || user.is_anonymous) return null
  const { data: profile } = await client.from('profiles').select('role,is_banned').eq('id', user.id).single()
  if (!profile || profile.is_banned) return null
  return { client, user, profile }
}
async function present(record: Record<string, unknown> | null) {
  if (!record) return null
  const storage = createServiceClient().storage.from(bucket)
  const responses = await Promise.all([record.front_path, record.back_path].map(path => storage.createSignedUrl(String(path), 120)))
  if (responses.some(result => result.error || !result.data?.signedUrl)) throw new Error('Não foi possível abrir os anexos.')
  return {
    full_name: record.full_name, document_number: record.document_number,
    birth_date: record.birth_date, expiry_date: record.expiry_date,
    country: record.country, document_type: record.document_type,
    authenticity_verified: false, revision: record.revision, submitted_at: record.submitted_at,
    expired: String(record.expiry_date) < mozambiqueToday(),
    front_url: responses[0].data!.signedUrl, back_url: responses[1].data!.signedUrl,
  }
}
export async function GET(request: Request) {
  try {
    const auth = await authenticate()
    if (!auth) return json({ error: 'Inicie sessão para consultar o BI.' }, 401)
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId') || auth.user.id
    if (userId !== auth.user.id && auth.profile.role !== 'admin') return json({ error: 'Sem permissão.' }, 403)
    if (!/^[0-9a-f-]{36}$/i.test(userId)) return json({ error: 'Utilizador inválido.' }, 400)
    const { data, error } = await auth.client.from('profile_identity_documents').select('*').eq('user_id', userId).maybeSingle()
    if (error) return json({ error: 'Não foi possível consultar o BI.' }, 503)
    return json({ document: await present(data) })
  } catch { return json({ error: 'Não foi possível consultar o BI. Tente novamente.' }, 503) }
}
export async function POST(request: Request) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'Origem inválida.' }, 403)
  if (Number(request.headers.get('content-length') || 0) > 4_300_000) return json({ error: 'Fotografias demasiado grandes.' }, 413)
  const auth = await authenticate()
  if (!auth) return json({ error: 'Inicie sessão para guardar o BI.' }, 401)
  let form: FormData
  try { form = await request.formData() } catch { return json({ error: 'Envio inválido.' }, 400) }
  if (form.get('consent') !== BI_CONSENT_VERSION) return json({ error: 'Confirme a autorização para guardar o BI.' }, 400)
  const photos: Uint8Array[] = []
  for (const side of ['front', 'back']) {
    const file = form.get(side)
    if (!(file instanceof File) || file.type !== 'image/jpeg' || file.size < 100 || file.size > BI_MAX_BYTES) return json({ error: 'Frente e verso devem ser imagens JPEG até 2 MB cada.' }, 400)
    const bytes = new Uint8Array(await file.arrayBuffer())
    if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255) return json({ error: 'Fotografia inválida.' }, 400)
    photos.push(bytes)
  }
  const service = createServiceClient()
  const storage = service.storage.from(bucket)
  const { data: previous, error: previousError } = await service.from('profile_identity_documents').select('revision,front_path,back_path').eq('user_id', auth.user.id).maybeSingle()
  if (previousError) return json({ error: 'Não foi possível guardar o BI.' }, 503)
  // Compare-and-swap prevents simultaneous replacements from deleting the active attachments.
  if ((form.get('revision') || null) !== (previous?.revision || null)) return json({ error: 'O BI foi alterado noutra sessão. Atualize a página.' }, 409)
  const { data: claimed, error: limitError } = await service.rpc('claim_identity_extraction', { p_user_id: auth.user.id })
  if (limitError) return json({ error: 'Serviço de leitura temporariamente indisponível.' }, 503)
  if (!claimed) return json({ error: 'Limite de leituras atingido. Aguarde 10 minutos antes de tentar novamente.' }, 429)
  let fields
  try { fields = validateIdentityFields(await extractIdentityDocument(photos)) }
  catch (error) { return json({ error: error instanceof Error ? error.message : 'Não foi possível ler o BI.' }, 422) }
  const revision = crypto.randomUUID()
  const paths = ['front', 'back'].map(side => `${auth.user.id}/${revision}/${side}.jpg`)
  for (let i = 0; i < paths.length; i++) {
    const { error } = await storage.upload(paths[i], photos[i], { contentType: 'image/jpeg', upsert: false, cacheControl: '0' })
    if (error) {
      await storage.remove(paths.slice(0, i))
      return json({ error: 'Não foi possível guardar as fotografias. Tente novamente.' }, 503)
    }
  }
  const row = { ...fields, source: 'gemini_server_extraction', user_id: auth.user.id, revision, front_path: paths[0], back_path: paths[1], consent_version: BI_CONSENT_VERSION, submitted_at: new Date().toISOString(), authenticity_verified: false }
  const write = previous
    ? service.from('profile_identity_documents').update(row).eq('user_id', auth.user.id).eq('revision', previous.revision)
    : service.from('profile_identity_documents').insert(row)
  const { data, error } = await write.select('*').maybeSingle()
  if (error || !data) {
    await storage.remove(paths)
    return json({ error: 'Não foi possível guardar o BI. Atualize a página e tente novamente.' }, error?.code === '23505' || !data ? 409 : 503)
  }
  if (previous) await storage.remove([previous.front_path, previous.back_path])
  // Saving succeeded even if issuing temporary viewing URLs fails.
  return json({ saved: true })
}
