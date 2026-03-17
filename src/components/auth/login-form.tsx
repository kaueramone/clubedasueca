'use client'

import { useFormState } from 'react-dom'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { login } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'

const TURNSTILE_SITE_KEY = '0x4AAAAAACsNPdO_nwmclG_7'

const initialState = {
    error: null as string | null,
}

export function LoginForm() {
    // @ts-ignore - useFormState types can be tricky with server actions
    const [state, formAction] = useFormState(login, initialState)
    const [showPassword, setShowPassword] = useState(false)
    const turnstileRef = useRef<HTMLDivElement>(null)
    const widgetIdRef = useRef<string | null>(null)

    useEffect(() => {
        const scriptId = 'cf-turnstile-script'
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script')
            script.id = scriptId
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
            script.async = true
            script.defer = true
            document.head.appendChild(script)
        }

        const tryRender = () => {
            if (typeof (window as any).turnstile !== 'undefined' && turnstileRef.current && !widgetIdRef.current) {
                widgetIdRef.current = (window as any).turnstile.render(turnstileRef.current, {
                    sitekey: TURNSTILE_SITE_KEY,
                    theme: 'light',
                })
            } else if (typeof (window as any).turnstile === 'undefined') {
                setTimeout(tryRender, 300)
            }
        }
        setTimeout(tryRender, 300)
    }, [])

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
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        required
                        className="block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 pr-12 text-gray-900 focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                        placeholder="••••••••"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {state?.error && (
                <div className="rounded-md bg-red-50 p-4">
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

            <div ref={turnstileRef} className="flex justify-center" />

            <SubmitButton className="flex w-full justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-all active:scale-[0.98]">
                Entrar
            </SubmitButton>
        </form>
    )
}
