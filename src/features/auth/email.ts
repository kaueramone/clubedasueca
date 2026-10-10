export const emailDomains = ['clubedasueca.pt', 'clubedasueca.co.mz'] as const
const originDomains = [...emailDomains, 'clubedasueca.com', 'clubedasueca.com.br']

type AuthEmail = { from: string; to: string[]; subject: string; html: string; text: string }
type EmailData = Record<string, unknown>
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
const requiredString = (value: unknown) => {
  if (typeof value !== 'string' || !value || value.length > 2048) throw new Error('invalid_payload')
  return value
}
const address = (value: unknown) => {
  const result = requiredString(value)
  if (result.length > 254 || !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(result)) throw new Error('invalid_recipient')
  return result
}

export function emailOrigin(value: unknown) {
  const url = new URL(requiredString(value))
  const domain = url.hostname.replace(/^www\./, '')
  if (url.protocol !== 'https:' || url.port || url.username || url.password || !originDomains.includes(domain)) throw new Error('invalid_origin')
  return { origin: url.origin, domain: emailDomains.some(d => d === domain) ? domain : 'clubedasueca.pt' }
}

function message(domain: string, to: string, title: string, description: string, link?: string, otp?: string): AuthEmail {
  const subject = `Clube da Sueca — ${title}`
  const detail = link ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#0F3D2E;color:#fff;padding:14px 24px;border-radius:10px;text-decoration:none">Continuar</a></p><p style="word-break:break-all;font-size:12px">Ou copie este endereço: ${escapeHtml(link)}</p>` : otp ? `<p style="font-size:28px;font-weight:bold;letter-spacing:4px">${escapeHtml(otp)}</p>` : ''
  return {
    from: `Clube da Sueca <noreply@${domain}>`, to: [to], subject,
    html: `<!doctype html><html lang="pt"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;padding:24px;background:#f8fafc;font-family:Arial,sans-serif;color:#334155"><main style="max-width:560px;margin:auto;background:#fff;padding:28px;border-radius:16px"><p style="color:#0F3D2E;font-weight:bold">Clube da Sueca</p><h1 style="font-size:24px;color:#0F3D2E">${escapeHtml(title)}</h1><p>${escapeHtml(description)}</p>${detail}<p style="font-size:12px;color:#64748b">Se não reconhece esta ação, contacte o apoio através da plataforma. Não partilhe códigos ou links de acesso.</p></main></body></html>`,
    text: `${subject}\n\n${description}\n\n${link || otp || ''}\n\nSe não reconhece esta ação, contacte o apoio através da plataforma. Não partilhe códigos ou links de acesso.`,
  }
}

const notices: Record<string, [string, string]> = {
  password_changed_notification: ['Senha alterada', 'A senha da sua conta foi alterada.'],
  email_changed_notification: ['Email alterado', 'O endereço de email da sua conta foi alterado.'],
  phone_changed_notification: ['Telefone alterado', 'O número de telefone da sua conta foi alterado.'],
  identity_linked_notification: ['Método de acesso adicionado', 'Foi adicionado um método de acesso à sua conta.'],
  identity_unlinked_notification: ['Método de acesso removido', 'Foi removido um método de acesso da sua conta.'],
  mfa_factor_enrolled_notification: ['Verificação adicionada', 'Foi adicionado um método de verificação à sua conta.'],
  mfa_factor_unenrolled_notification: ['Verificação removida', 'Foi removido um método de verificação da sua conta.'],
}

export function buildAuthEmails(payload: unknown, supabaseUrl: string): AuthEmail[] {
  if (!payload || typeof payload !== 'object') throw new Error('invalid_payload')
  const { user, email_data: data } = payload as { user?: EmailData; email_data?: EmailData }
  if (!user || !data) throw new Error('invalid_payload')
  // The current request's redirect is authoritative. Never store the sender on the user profile.
  // Notifications without a request redirect use the project's trusted Site URL.
  const { origin, domain } = emailOrigin(data.redirect_to || data.site_url)
  const to = address(user.email)
  const action = requiredString(data.email_action_type)
  const link = (hash: unknown, type: string) => {
    const token = requiredString(hash)
    if (!/^[A-Za-z0-9_-]{20,512}$/.test(token)) throw new Error('invalid_token')
    if (type === 'recovery') {
      const url = new URL('/auth/confirm', origin)
      url.searchParams.set('token_hash', token)
      url.searchParams.set('type', 'recovery')
      return url.href
    }
    const url = new URL('/auth/v1/verify', supabaseUrl)
    url.searchParams.set('token', token)
    url.searchParams.set('type', type)
    url.searchParams.set('redirect_to', new URL('/auth/callback', origin).href)
    return url.href
  }
  if (Object.hasOwn(notices, action)) {
    const [title, description] = notices[action]
    const recipients = action === 'email_changed_notification' && data.old_email ? [...new Set([to, address(data.old_email)])] : [to]
    return recipients.map(recipient => message(domain, recipient, title, description))
  }
  if (action === 'reauthentication') {
    const otp = requiredString(data.token)
    if (!/^\d{4,12}$/.test(otp)) throw new Error('invalid_token')
    return [message(domain, to, 'Código de verificação', 'Use este código para confirmar a operação na plataforma.', undefined, otp)]
  }
  if (action === 'email_change') {
    const newEmail = address(user.new_email)
    const description = 'Confirme a alteração do endereço de email da sua conta.'
    // Supabase's legacy field naming is reversed for secure email changes.
    const result = [message(domain, newEmail, 'Confirmar novo email', description, link(data.token_hash, action))]
    if (data.token_hash_new) result.unshift(message(domain, to, 'Confirmar alteração de email', description, link(data.token_hash_new, action)))
    return result
  }
  const content: Record<string, [string, string]> = {
    recovery: ['Recuperação de senha', 'Continue para escolher uma nova senha. Se não pediu esta recuperação, ignore este email.'],
    signup: ['Confirmar conta', 'Confirme o seu email para ativar a conta no Clube da Sueca.'],
    email: ['Confirmar email', 'Confirme o seu endereço de email no Clube da Sueca.'],
    magiclink: ['Aceder à conta', 'Continue para entrar na sua conta do Clube da Sueca.'],
    invite: ['Convite para o Clube da Sueca', 'Continue para aceitar o convite para a plataforma.'],
  }
  if (!Object.hasOwn(content, action)) throw new Error('unsupported_action')
  const [title, description] = content[action]
  return [message(domain, to, title, description, link(data.token_hash, action))]
}
