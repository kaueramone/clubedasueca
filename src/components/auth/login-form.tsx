'use client'

import { useActionState } from 'react'
import { useRef, useState } from 'react'
import { useTurnstile } from './use-turnstile'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { login } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'


const initialState = {
    error: null as string | null,
}

export function LoginForm() {
    const { containerRef: turnstileRef, reset, token, error: securityError } = useTurnstile()
    const [email, setEmail] = useState('')
    const passwordRef = useRef<HTMLInputElement>(null)
    const [state, formAction] = useActionState(async (previous: typeof initialState, formData: FormData) => {
        try { return await login(previous, formData) } finally {
            if (passwordRef.current) passwordRef.current.value = ''
            setShowPassword(false)
            reset()
        }
    }, initialState)
    const [showPassword, setShowPassword] = useState(false)
    return (
        <form action={formAction} className="space-y-6">
            <div>
                <label
                    htmlFor="email"
                    className="block text-sm font-medium text-gray-700"
                >
                    Email
                </label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    placeholder="seu@email.com"
                />
            </div>

            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                >
                    Password
                </label>
                <div className="relative mt-1">
                    <input
                        ref={passwordRef}
                        autoComplete="current-password"
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 pr-12 text-gray-900 focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                        aria-pressed={showPassword}
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {state?.error && (
                <div role="alert" className="rounded-md bg-red-50 p-4">
                    <div className="flex">
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Erro</h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{state.error}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <div className="text-sm">
                    <Link
                        href="/forgot-password"
                        className="font-medium text-accent hover:text-accent/80"
                    >
                        Esqueceu a password?
                    </Link>
                </div>
            </div>

            <input type="hidden" name="cf-turnstile-response" value={token} />
            <div ref={turnstileRef} className="flex justify-center" />
            <p role="status" className="text-sm text-gray-600">{securityError || (token ? 'Verificação de segurança concluída.' : 'A verificar segurança…')}</p>
            {securityError && <button type="button" onClick={reset} className="text-sm text-accent underline">Tentar verificação novamente</button>}

            <SubmitButton disabled={!token} className="flex w-full justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-all active:scale-[0.98]">
                Entrar
            </SubmitButton>
        </form>
    )
}
