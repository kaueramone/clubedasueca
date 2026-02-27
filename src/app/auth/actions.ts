'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { applyWelcomeBonus } from '@/features/bonuses/actions'
import { registerReferral } from '@/features/affiliates/actions'
import { trackUserMetrics } from '@/features/crm/actions'

export async function login(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string

    const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
    })

    if (error) {
        return { error: error.message }
    }

    revalidatePath('/', 'layout')
    redirect('/dashboard')
}

export async function signup(prevState: any, formData: FormData) {
    const supabase = await createClient()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const fullName = formData.get('fullName') as string

    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                full_name: fullName,
            },
        },
    })

    if (error) {
        return { error: error.message }
    }

    // Apply welcome bonus (non-blocking)
    const { data: { user: newUser } } = await supabase.auth.getUser()
    if (newUser) {
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

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/auth/callback?next=/update-password`,
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
