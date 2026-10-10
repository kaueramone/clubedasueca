'use client'

import { useActionState } from 'react'
import { forgotPassword } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'

const initialState = {
    error: null as string | null,
    success: false,
}

export function ForgotPasswordForm() {
    const [state, formAction] = useActionState(async (_previous: typeof initialState, formData: FormData) => forgotPassword(formData), initialState)

    if (state.success) return <div role="status" className="space-y-4 text-sm text-gray-700">
        <p className="rounded-xl bg-green-50 border border-green-200 p-4">Se existir uma conta com esse email, receberá um link para escolher uma nova senha.</p>
        <p>Verifique também a pasta de spam. Utilize o email mais recente; cada link só pode ser usado uma vez.</p>
        <button type="button" onClick={() => window.location.reload()} className="text-accent underline">Pedir outro link</button>
    </div>

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

            <SubmitButton className="flex w-full justify-center rounded-xl bg-[#0F3D2E] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#0b3026] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-all active:scale-[0.98]">
                Enviar Email de Recuperação
            </SubmitButton>
        </form>
    )
}
