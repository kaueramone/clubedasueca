const productionHosts = new Set([
  'clubedasueca.co.mz', 'www.clubedasueca.co.mz',
  'clubedasueca.pt', 'www.clubedasueca.pt',
  'clubedasueca.com', 'www.clubedasueca.com',
  'clubedasueca.com.br', 'www.clubedasueca.com.br',
  'clubedasueca.vercel.app',
])

export function recoveryOrigin(origin: string | null, fallback: string | undefined, development = false) {
  for (const value of [origin, fallback, 'https://clubedasueca.co.mz']) {
    if (!value) continue
    try {
      const url = new URL(value)
      if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) continue
      if (url.protocol === 'https:' && !url.port && productionHosts.has(url.hostname)) return url.origin
      if (development && url.protocol === 'http:' && url.hostname === 'localhost') return url.origin
    } catch { /* Only explicitly trusted origins can receive a recovery link. */ }
  }
  return 'https://clubedasueca.co.mz'
}

export function safeAuthNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u0020]/.test(value)) return '/dashboard'
  return value
}

export function passwordValidation(password: unknown, confirmation: unknown) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) return 'A senha deve ter entre 8 e 128 caracteres.'
  if (password !== confirmation) return 'As senhas não coincidem.'
  return null
}

export function validRecoveryToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{20,512}$/.test(value)
}
