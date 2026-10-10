import { Webhook } from 'standardwebhooks'
import { buildAuthEmails, emailDomains } from '@/features/auth/email'

export const runtime = 'nodejs'
const maxBodyBytes = 64 * 1024
const result = (status: number, message?: string) => Response.json(message ? { error: { http_code: status, message } } : {}, { status, headers: { 'Cache-Control': 'no-store' } })

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET
  const keyPt = process.env.RESEND_API_KEY_PT
  const keyMz = process.env.RESEND_API_KEY_MZ
  const verified = (process.env.AUTH_EMAIL_VERIFIED_DOMAINS || '').split(',').map(d => d.trim())
  // Do not attach this hook to Supabase until both configured senders are verified.
  if (process.env.AUTH_EMAIL_HOOK_ENABLED !== 'true' || !secret || !keyPt || !keyMz || !emailDomains.every(d => verified.includes(d))) return result(503, 'Email service not configured')
  if (!request.body || Number(request.headers.get('content-length') || 0) > maxBodyBytes) return result(413, 'Invalid request size')
  const reader = request.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maxBodyBytes) {
        await reader.cancel()
        return result(413, 'Invalid request size')
      }
      chunks.push(value)
    }
  } catch { return result(400, 'Invalid request body') }
  let payload: unknown
  const id = request.headers.get('webhook-id') || ''
  if (!/^[A-Za-z0-9_-]{1,200}$/.test(id)) return result(401, 'Invalid signature')
  try {
    payload = new Webhook(secret.replace(/^v1,/, '')).verify(Buffer.concat(chunks).toString('utf8'), Object.fromEntries(request.headers))
  } catch { return result(401, 'Invalid signature') }
  let emails
  try {
    emails = buildAuthEmails(payload, process.env.NEXT_PUBLIC_SUPABASE_URL!)
  } catch { return result(400, 'Invalid email event') }
  try {
    const apiKey = emails[0].from === 'Clube da Sueca <noreply@clubedasueca.co.mz>' ? keyMz : keyPt
    const response = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': `auth-${id}` },
      body: JSON.stringify(emails),
      signal: AbortSignal.timeout(3500),
    })
    // Never return provider errors: they can contain addresses, credentials or access links.
    if (!response.ok) return result(503, 'Email delivery temporarily unavailable')
  } catch { return result(503, 'Email delivery temporarily unavailable') }
  return result(200)
}
