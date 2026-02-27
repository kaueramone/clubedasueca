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
            <select name="stake" className="rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-accent focus:outline-none">
                <option value="1">1.00€</option>
                <option value="2">2.00€</option>
                <option value="5">5.00€</option>
                <option value="10">10.00€</option>
                <option value="20">20.00€</option>
            </select>
            <SubmitButton className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90">
                <PlusCircle className="h-4 w-4" />
                Criar Mesa
            </SubmitButton>
            {state?.error && <p className="text-red-500 text-xs">{state.error}</p>}
        </form>
    )
}
