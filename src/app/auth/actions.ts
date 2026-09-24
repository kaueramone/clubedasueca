'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'


import { createClient } from '@/lib/supabase/server'

import { registerReferral } from '@/features/affiliates/actions'


const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY

async function verifyTurnstile(token: string | null): Promise<boolean> {
    if (!token || !TURNSTILE_SECRET) return false
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
    return process.env.NEXT_PUBLIC_BASE_URL || 'https://clubedasueca.co.mz'
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

    if (data.user) {
        const { data: profile, error: profileError } = await supabase.from('profiles').select('is_banned').eq('id', data.user.id).single()
        if (profileError || !profile || profile.is_banned) {
            await supabase.auth.signOut()
            return { error: 'Conta indisponível. Contacta o apoio.' }
        }
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

    const dob = new Date(birthDate + 'T00:00:00Z')
    const cutoff = new Date()
    cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate || '') || !Number.isFinite(dob.getTime()) || dob.toISOString().slice(0, 10) !== birthDate || dob > cutoff || dob.getUTCFullYear() < new Date().getUTCFullYear() - 120) {
        return { error: 'É necessário ter pelo menos 18 anos. Confirma a data de nascimento.' }
    }

    if (password !== confirmPassword) {
        return { error: 'As passwords não coincidem. Tente novamente.' }
    }

    const { error, data: signupData } = await supabase.auth.signUp({
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

    // Initial test credit is issued once by the database on email activation.
    // Referral registration is awaited when a session exists; email confirmation may precede it.
    const refCode = formData.get('refCode') as string
    if (signupData.session && signupData.user && refCode) {
        await registerReferral(signupData.user.id, refCode)
    }
    if (!signupData.session) redirect('/login?message=Confirma o teu email para ativar a conta de teste')

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
