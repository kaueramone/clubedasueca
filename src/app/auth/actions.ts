'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

import { createClient } from '@/lib/supabase/server'
import { applyWelcomeBonus } from '@/features/bonuses/actions'
import { registerReferral } from '@/features/affiliates/actions'
import { trackUserMetrics } from '@/features/crm/actions'

const TURNSTILE_SECRET = '0x4AAAAAACsNPXDmhbBSYA3_Hv6dSgnaHaQ'

async function verifyTurnstile(token: string | null): Promise<boolean> {
    if (!token) return false
    try {
        const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ secret: TURNSTILE_SECRET, response: token }),
        })
        const data = await res.json()
        return data.success === true
    } catch {
        return false
    }
}

async function getBaseUrl(): Promise<string> {
    const headersList = await headers()
    const host = headersList.get('host')
    const proto = headersList.get('x-forwarded-proto') || 'https'
    if (host) return `${proto}://${host}`
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://clubedasueca.pt'
}

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const turnstileToken = formData.get('cf-turnstile-response') as string
    const isHuman = await verifyTurnstile(turnstileToken)
    if (!isHuman) {
        return { error: 'Verificação de segurança falhou. Por favor tente novamente.' }
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    // Rotate session_id — any other open session will detect the change and sign out
    if (data.user) {
        await supabase.from('profiles')
            .update({ session_id: crypto.randomUUID() })
            .eq('id', data.user.id)
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const turnstileToken = formData.get('cf-turnstile-response') as string
    const isHuman = await verifyTurnstile(turnstileToken)
    if (!isHuman) {
        return { error: 'Verificação de segurança falhou. Por favor tente novamente.' }
    }

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string
    const fullName = formData.get('fullName') as string
    const birthDate = formData.get('birthDate') as string
    const nationality = formData.get('nationality') as string

    if (password !== confirmPassword) {
        return { error: 'As passwords não coincidem. Tente novamente.' }
    }

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
                birth_date: birthDate,
                nationality: nationality
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    const { data: { user: newUser } } = await supabase.auth.getUser()
    if (newUser) {
        // ⚠️  FASE DE TESTES — remover quando os gateways de pagamento estiverem configurados
        // Crédito de boas-vindas: 10€ direto na carteira para cada conta nova
        ;(async () => {
            try {
                const { data: wallet } = await supabase
                    .from('wallets')
                    .upsert(
                        { user_id: newUser.id, balance: 10.00, currency: 'EUR' },
                        { onConflict: 'user_id', ignoreDuplicates: false }
                    )
                    .select('id')
                    .single()

                if (wallet) {
                    await supabase.from('transactions').insert({
                        wallet_id: wallet.id,
                        amount: 10.00,
                        type: 'credit',
                        description: '🎁 Crédito de Boas-Vindas — Fase de Testes',
                    })
                }
            } catch (err) {
                console.error('[TESTING_CREDIT]', err)
            }
        })()
        // ⚠️  FIM DA REGRA DE TESTES

        // Apply welcome bonus (non-blocking)
        applyWelcomeBonus(newUser.id).catch(err =>
            console.error('[WELCOME_BONUS]', err)
        )

        // Track affiliate referral if ref code exists
        const refCode = formData.get('refCode') as string
        if (refCode) {
            registerReferral(newUser.id, refCode).catch(err =>
                console.error('[REFERRAL]', err)
            )
        }

        // Initialize CRM metrics (non-blocking)
        trackUserMetrics(newUser.id, {}).catch(err => console.error('[CRM_INIT]', err))
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signout() {
    const supabase = await createClient()
    await supabase.auth.signOut()
    revalidatePath('/', 'layout')
    redirect('/login')
}

export async function forgotPassword(formData: FormData) {
    const supabase = await createClient()
    const email = formData.get('email') as string

    const baseUrl = await getBaseUrl()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/callback?next=/update-password`,
    })

    if (error) {
        return { error: error.message }
    }

    // usually redirect to a confirmation page or show a generic message
    redirect('/login?message=Verifique o seu email para recuperar a password')
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password') as string

    const { error } = await supabase.auth.updateUser({
        password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
