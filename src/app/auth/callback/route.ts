import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const requested = searchParams.get('next') ?? '/dashboard'
    const next = requested.startsWith('/') && !requested.startsWith('//') && !requested.includes('\\') ? requested : '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = user ? await supabase.from('profiles').select('is_banned').eq('id', user.id).single() : { data: null }
            if (!profile || profile.is_banned) {
                await supabase.auth.signOut()
                return NextResponse.redirect(`${origin}/login?message=Conta%20indispon%C3%ADvel.%20Contacta%20o%20apoio.`)
            }
            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
