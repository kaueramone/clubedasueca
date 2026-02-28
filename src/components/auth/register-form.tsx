'use client'

import { useFormState } from 'react-dom'
import { useState } from 'react'
import Link from 'next/link'
import { signup } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'
import { Eye, EyeOff } from 'lucide-react'

const initialState = {
    error: null as string | null,
}

export function RegisterForm() {
    // @ts-ignore
    const [state, formAction] = useFormState(signup, initialState)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    return (
        <form action={formAction} className="space-y-4">
            <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 font-bold focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    placeholder="JoÃ£o Silva"
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="birthDate" className="block text-sm font-medium text-gray-700">Nascimento</label>
                    <input
                        id="birthDate"
                        name="birthDate"
                        type="date"
                        required
                        className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 font-bold focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    />
                </div>
                <div>
                    <label htmlFor="nationality" className="block text-sm font-medium text-gray-700">Nacionalidade</label>
                    <select
                        id="nationality"
                        name="nationality"
                        required
                        className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 font-bold focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    >
                        <option value="">Selecione...</option>
                        <option value="Portugal">Portugal</option>
                        <option value="Brasil">Brasil</option>
                        <option value="Angola">Angola</option>
                        <option value="Cabo Verde">Cabo Verde</option>
                        <option value="MoÃ§ambique">MoÃ§ambique</option>
                        <option value="S. TomÃ© e PrÃ­ncipe">S. TomÃ© e PrÃ­ncipe</option>
                        <option value="GuinÃ©-Bissau">GuinÃ©-Bissau</option>
                        <option value="Outra">Outra</option>
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 font-bold focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    placeholder="seu@email.com"
                />
            </div>

            <div className="relative">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 font-bold focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
            </div>

            <div className="relative">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">Confirmar Password</label>
                <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    className="mt-1 block w-full rounded-lg border border-gray-300 bg-ios-gray6 px-4 py-3 text-gray-900 font-bold focus:border-accent focus:outline-none focus:ring-accent sm:text-sm transition-all"
                    placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-[34px] text-gray-400 hover:text-gray-600 transition-colors">
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
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

            <SubmitButton className="flex w-full justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-all active:scale-[0.98] mt-2">
                Criar Conta
            </SubmitButton>
        </form>
    )
}
