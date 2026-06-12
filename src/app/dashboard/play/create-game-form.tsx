'use client'

import { useFormState } from 'react-dom'
import { createGame } from './actions'
import { SubmitButton } from '@/components/submit-button'
import { PlusCircle } from 'lucide-react'

const initialState = {
    error: null as string | null,
}

export function CreateGameForm() {
    // @ts-ignore
    const [state, formAction] = useFormState(createGame, initialState)

    return (
        <form action={formAction} className="flex gap-2 items-center">
            <select name="stake" className="rounded-xl border border-white/20 sm:border-gray-300 bg-transparent sm:bg-white text-white sm:text-gray-900 px-3 py-2 text-sm focus:border-accent focus:outline-none appearance-none pr-8 relative" style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.5rem center', backgroundSize: '1em' }}>
                <option value="50" className="text-gray-900 bg-white">50 MT</option>
                <option value="100" className="text-gray-900 bg-white">100 MT</option>
                <option value="250" className="text-gray-900 bg-white">250 MT</option>
                <option value="500" className="text-gray-900 bg-white">500 MT</option>
                <option value="1000" className="text-gray-900 bg-white">1000 MT</option>
            </select>
            <SubmitButton className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
                <PlusCircle className="h-4 w-4" />
                Criar Mesa
            </SubmitButton>
            {state?.error && <p className="text-red-500 text-xs">{state.error}</p>}
        </form>
    )
}
