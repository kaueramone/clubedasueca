'use client'

import { useFormStatus } from 'react-dom'
import { GlobalLoader } from './global-loader'

export function SubmitButton({
    children,
    className,
}: {
    children: React.ReactNode
    className?: string
}) {
    const { pending } = useFormStatus()

    return (
        <>
            <button
                type="submit"
                disabled={pending}
                className={`${className} ${pending ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {pending ? 'A processar...' : children}
            </button>
            <GlobalLoader isVisible={pending} />
        </>
    )
}
