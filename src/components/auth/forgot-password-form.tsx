'use client'

import { useFormState } from 'react-dom'
import { forgotPassword } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'

const initialState = {
    error: null as string | null,
}

export function ForgotPasswordForm() {
    // @ts-ignore
    const [state, formAction] = useFormState(forgotPassword, initialState)

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

            <SubmitButton className="flex w-full justify-center rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-all active:scale-[0.98]">
                Enviar Email de Recuperação
            </SubmitButton>
        </form>
    )
}
