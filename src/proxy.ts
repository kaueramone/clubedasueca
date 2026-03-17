import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const ALLOWED_HOSTS = [
    'clubedasueca.pt',
    'www.clubedasueca.pt',
    'clubedasueca.com.br',
    'www.clubedasueca.com.br',
    'clubedasueca.com',
    'www.clubedasueca.com',
    'localhost',
]

export async function proxy(request: NextRequest) {
    const host = request.headers.get('host') || ''
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
