import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Token-hash email links work without the browser-specific PKCE verifier.
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token_hash')
  const response = (path: string) => {
    const result = NextResponse.redirect(new URL(path, url.origin))
    result.headers.set('Cache-Control', 'no-store')
    result.headers.set('Referrer-Policy', 'no-referrer')
    return result
  }
  if (!token || token.length > 512 || url.searchParams.get('type') !== 'recovery') return response('/update-password?error=invalid_link')
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' })
  if (error) return response('/update-password?error=invalid_link')
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user ? await supabase.from('profiles').select('is_banned').eq('id', user.id).single() : { data: null }
  if (!profile || profile.is_banned) {
    await supabase.auth.signOut()
    return response('/login?message=Conta%20indispon%C3%ADvel.%20Contacte%20o%20apoio.')
  }
  return response('/update-password')
}
