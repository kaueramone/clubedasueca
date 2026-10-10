'use client'

import { useActionState } from 'react'
import { updatePassword } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'

const initialState = {
    error: null as string | null,
}

export function UpdatePasswordForm() {
    const [state, formAction] = useActionState(async (_previous: typeof initialState, formData: FormData) => updatePassword(formData), initialState)

    return (
        <form action={formAction} className="space-y-6">
            <div>
                <label
                    htmlFor="password"
                    className="block text-sm font-medium text-gray-700"
                >
                    Nova senha
                </label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    placeholder="••••••••"
                />
                <p className="mt-2 text-xs text-gray-600">Entre 8 e 128 caracteres.</p>
            </div>
            <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar nova senha</label>
                <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} maxLength={128} autoComplete="new-password"
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 focus:border-accent focus:outline-none focus:ring-accent sm:text-sm"
                    placeholder="Repita a nova senha" />
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
                Atualizar senha
            </SubmitButton>
        </form>
    )
}
