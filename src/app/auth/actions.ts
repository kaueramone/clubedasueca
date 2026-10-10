'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { recoveryOrigin, passwordValidation, validRecoveryToken } from '@/features/auth/recovery'


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

export async function login(prevState: unknown, formData: FormData) {
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

export async function signup(prevState: unknown, formData: FormData) {
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
    const email = String(formData.get('email') || '').trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return { error: 'Introduza um email válido.', success: false }

    const baseUrl = recoveryOrigin((await headers()).get('origin'), process.env.NEXT_PUBLIC_BASE_URL, process.env.NODE_ENV === 'development')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/confirm`,
    })

    if (error) {
        return { error: 'Não foi possível enviar o email agora. Aguarde um pouco e tente novamente.', success: false }
    }

    return { error: null, success: true }
}

export async function confirmRecovery(formData: FormData): Promise<{ error: string | null }> {
    const token = formData.get('token_hash')
    const invalid = { error: 'O link é inválido, expirou ou já foi utilizado. Peça outro email e use o link mais recente.' }
    if (!validRecoveryToken(token)) return invalid
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' })
    if (error) return invalid
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user ? await supabase.from('profiles').select('is_banned').eq('id', user.id).single() : { data: null }
    if (!profile || profile.is_banned) {
        await supabase.auth.signOut()
        return { error: 'Conta indisponível. Contacte o apoio.' }
    }
    redirect('/update-password')
}

export async function updatePassword(formData: FormData) {
    const supabase = await createClient()
    const password = formData.get('password')
    const validation = passwordValidation(password, formData.get('confirmPassword'))
    if (validation) return { error: validation }
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return { error: 'A sessão de recuperação expirou. Solicite um novo link.' }
    const { data: profile } = await supabase.from('profiles').select('is_banned').eq('id', user.id).single()
    if (!profile || profile.is_banned) return { error: 'Conta indisponível. Contacte o apoio.' }

    const { error } = await supabase.auth.updateUser({
        password: password as string,
    })

    if (error) {
        return { error: error.code === 'same_password' ? 'Escolha uma senha diferente da atual.' : 'Não foi possível atualizar a senha. Verifique os requisitos e tente novamente.' }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}
