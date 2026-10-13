'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'

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
        {blocked && <div className="fixed inset-0 z-[100] bg-[#080c0b]">
            <div aria-hidden="true" className="absolute inset-0 bg-[url('/images/partida-luso-mocambicana.png')] bg-cover bg-center opacity-30 blur-sm" />
            <dialog ref={dialog} open tabIndex={-1} aria-labelledby="age-title" aria-describedby="age-description" onCancel={event => event.preventDefault()} className="age-welcome fixed inset-0 m-auto max-h-[94dvh] w-[calc(100%-2rem)] max-w-[34rem] overflow-y-auto rounded-3xl border border-[#d4af37]/40 bg-[#101715] p-0 text-[#f5f2e8] shadow-[0_30px_100px_rgba(0,0,0,0.65)] backdrop:bg-black/55 backdrop:backdrop-blur-sm">
                <div className="relative isolate overflow-hidden px-6 pb-6 pt-7 text-center sm:px-10 sm:pb-7 sm:pt-9">
                    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.12),transparent_65%)]" />
                    <div aria-hidden="true" className="pointer-events-none absolute -right-3 top-16 -z-10 rotate-[18deg] rounded-xl border border-[#d4af37]/10 px-5 py-3 font-serif text-7xl text-[#d4af37]/10">♠</div>
                    <div aria-hidden="true" className="pointer-events-none absolute -left-5 top-24 -z-10 -rotate-[18deg] rounded-xl border border-[#d4af37]/10 px-5 py-3 font-serif text-7xl text-[#d4af37]/10">♣</div>
                    <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" width={288} height={80} className="mx-auto h-16 w-60 object-contain sm:h-20 sm:w-72" />
                    <div className="mx-auto mt-5 flex max-w-60 items-center gap-4" aria-hidden="true">
                        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d4af37]/50" />
                        <span className="rounded-full border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-1 text-xs font-bold tracking-widest text-[#e4c768]">18+</span>
                        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d4af37]/50" />
                    </div>
                    <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d9c67f] sm:text-xs">{decision === 'minor-v1' ? 'Jogar também é saber respeitar os limites' : 'Bem-vindo à nossa mesa'}</p>
                    <h1 id="age-title" className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">{decision === 'minor-v1' ? 'Esta mesa é para maiores de 18 anos.' : <>A mesa está pronta.<span className="mt-2 block text-2xl font-normal text-[#e4c768] sm:text-3xl">Tens 18 anos ou mais?</span></>}</h1>
                    <p id="age-description" className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-[#b9c2bd]">{decision === 'minor-v1' ? 'Não podes aceder aos jogos ou criar uma conta neste momento. As informações públicas continuam disponíveis abaixo.' : 'O Clube da Sueca é exclusivo para maiores de 18 anos. Joga com responsabilidade.'}</p>
                    {decision !== 'minor-v1' ? <div className="mt-6 grid gap-3">
                        <button autoFocus onClick={() => choose('adult-v1')} className="min-h-12 rounded-xl border border-[#f1d77f]/50 bg-gradient-to-r from-[#d4af37] to-[#e8cd76] px-4 py-3.5 text-sm font-bold text-[#151b16] shadow-[0_6px_24px_rgba(212,175,55,0.15)] transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e4c768]">Sim, tenho 18 anos ou mais <span aria-hidden="true" className="ml-1">→</span></button>
                        <button onClick={() => choose('minor-v1')} className="min-h-12 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#c8d0cb] transition hover:border-white/30 hover:bg-white/[0.07] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e4c768]">Não, tenho menos de 18 anos</button>
                    </div> : <div role="status" className="mt-6 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-4 py-4 text-sm font-medium text-[#e4c768]">Acesso à plataforma bloqueado nesta sessão.</div>}
                    <p className="mt-5 text-[11px] leading-relaxed text-[#99a89f]">Beta de testes · Créditos fictícios<br />Sem dinheiro real nem levantamentos.</p>
                    <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#b9c2bd]">
                        <Image src="/images/flags/mz.svg" alt="Moçambique" width={24} height={16} className="rounded-sm" />
                        <span aria-hidden="true" className="mx-1 text-[#d4af37]/60">·</span>
                        <Image src="/images/flags/pt.svg" alt="Portugal" width={24} height={16} className="rounded-sm" />
                        <span className="ml-1">Unidos pela Sueca</span>
                    </div>
                    <nav aria-label="Informações públicas" className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-3 border-t border-white/10 pt-4 text-[11px] text-[#b9c2bd] [&_a]:underline-offset-4 [&_a]:transition [&_a:hover]:text-[#e4c768] [&_a:hover]:underline">
                        <Link href="/p/termos#jogo-responsavel">Jogo responsável</Link><Link href="/p/termos">Termos</Link><Link href="/p/privacidade">Privacidade</Link><a href="mailto:contacto@clubedasueca.co.mz">Contactos</a>
                    </nav>
                    <noscript><p className="mt-4 text-sm">Activa JavaScript para confirmar a idade. As informações públicas continuam disponíveis.</p></noscript>
                </div>
            </dialog>
        </div>}
    </>
}
