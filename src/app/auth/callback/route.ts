import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeAuthNext } from '@/features/auth/recovery'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = safeAuthNext(searchParams.get('next'))

    if (code) {
        const supabase = await createClient()
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = user ? await supabase.from('profiles').select('is_banned').eq('id', user.id).single() : { data: null }
            if (!profile || profile.is_banned) {
                await supabase.auth.signOut()
                return NextResponse.redirect(`${origin}/login?message=Conta%20indispon%C3%ADvel.%20Contacta%20o%20apoio.`)
            }
            const recovery = 'redirectType' in data && data.redirectType === 'recovery'
            const response = NextResponse.redirect(`${origin}${recovery ? '/update-password' : next}`)
            response.headers.set('Cache-Control', 'no-store')
            response.headers.set('Referrer-Policy', 'no-referrer')
            return response
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}${next === '/update-password' ? '/update-password?error=invalid_link' : '/auth/auth-code-error'}`)
}
