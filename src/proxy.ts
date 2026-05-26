import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ALLOWED_HOSTS = [
    'clubedasueca.pt',
    'www.clubedasueca.pt',
    'clubedasueca.com.br',
    'www.clubedasueca.com.br',
    'clubedasueca.com',
    'www.clubedasueca.com',
    'clubedasueca.co.mz',
    'www.clubedasueca.co.mz',
    'vercel.app',
    'localhost',
]

export async function proxy(request: NextRequest) {
    const host = request.headers.get('host') || ''

    // A rota interna do watchdog (chamada pelo cron) é isenta do bloqueio de
    // host — ela já é protegida pelo segredo CRON_SECRET na própria rota.
    if (request.nextUrl.pathname.startsWith('/api/games/tick')) {
        return NextResponse.next()
    }

    if (process.env.NODE_ENV === 'production' && !ALLOWED_HOSTS.some(h => host.includes(h))) {
        return new NextResponse('Not Found', { status: 404 })
    }

    return await updateSession(request)
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|cards/|audio/|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|ogg|mp3)$).*)',
    ],
}
