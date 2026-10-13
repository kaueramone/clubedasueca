'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'

type Decision = 'adult-v1' | 'minor-v1' | ''

/** Browser declaration only; registration age checks remain authoritative. */
export function AgeGate({ initialDecision, children }: { initialDecision: Decision; children: React.ReactNode }) {
    const [decision, setDecision] = useState<Decision>(initialDecision)
    const dialog = useRef<HTMLDialogElement>(null)
    const pathname = usePathname()
    const blocked = decision !== 'adult-v1' && !pathname.startsWith('/p/')

    useEffect(() => {
        const element = dialog.current
        const preventCancel = (event: Event) => event.preventDefault()
        const keepOpen = () => {
            if (blocked && element?.isConnected && !element.open) element.showModal()
        }
        element?.addEventListener('cancel', preventCancel)
        element?.addEventListener('close', keepOpen)
        if (blocked && element && !element.matches(':modal')) {
            element.removeAttribute('open')
            element.showModal()
        }
        if (blocked && decision === 'minor-v1') element?.focus()
        const previous = document.body.style.overflow
        if (blocked) document.body.style.overflow = 'hidden'
        return () => {
            element?.removeEventListener('cancel', preventCancel)
            element?.removeEventListener('close', keepOpen)
            document.body.style.overflow = previous
        }
    }, [blocked, decision])

    function choose(value: Decision) {
        const lifetime = value === 'adult-v1' ? '; Max-Age=2592000' : ''
        document.cookie = `sueca_age_v1=${value}; Path=/; SameSite=Lax${lifetime}${location.protocol === 'https:' ? '; Secure' : ''}`
        setDecision(value)
    }

    return <>
        <div hidden={blocked} inert={blocked}>{children}</div>
        {blocked && <div className="fixed inset-0 z-[100] bg-black/80">
            <dialog ref={dialog} open tabIndex={-1} aria-labelledby="age-title" aria-describedby="age-description" onCancel={event => event.preventDefault()} className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-border bg-background p-6 text-foreground shadow-2xl backdrop:bg-black/80">
                <p className="mb-3 text-3xl font-bold text-accent">18+</p>
                <h1 id="age-title" className="text-2xl font-bold">{decision === 'minor-v1' ? 'Acesso reservado a maiores de 18 anos' : 'Tens 18 anos ou mais?'}</h1>
                <p id="age-description" className="mt-4 text-sm">O Clube da Sueca destina-se exclusivamente a maiores de 18 anos. Esta fase beta utiliza créditos fictícios, sem dinheiro real ou levantamentos.</p>
                {decision !== 'minor-v1' ? <div className="mt-6 grid gap-3">
                    <button autoFocus onClick={() => choose('adult-v1')} className="rounded-lg bg-primary px-4 py-3 font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Tenho 18 anos ou mais</button>
                    <button onClick={() => choose('minor-v1')} className="rounded-lg border border-border px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent">Tenho menos de 18 anos</button>
                </div> : <p className="mt-6" role="status">Não podes aceder aos jogos ou criar uma conta. Podes consultar as informações abaixo.</p>}
                <nav aria-label="Informações públicas" className="mt-6 flex flex-wrap gap-4 text-sm underline">
                    <Link href="/p/termos">Termos</Link><Link href="/p/privacidade">Privacidade</Link><a href="mailto:contacto@clubedasueca.co.mz">Contactos</a>
                </nav>
                <noscript><p className="mt-4">Activa JavaScript para confirmar a idade. As informações públicas continuam disponíveis.</p></noscript>
            </dialog>
        </div>}
    </>
}
