'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

type Turnstile = {
    render: (container: HTMLElement, options: { sitekey: string; theme: string; language: string; 'response-field': boolean;
        callback: (token: string) => void; 'expired-callback': () => void;
        'error-callback': () => void; 'timeout-callback': () => void }) => string
    reset: (id: string) => void
    remove: (id: string) => void
}
const api = () => (window as Window & { turnstile?: Turnstile }).turnstile
const SITE_KEY = '0x4AAAAAACsNPdO_nwmclG_7'

export function useTurnstile() {
    const containerRef = useRef<HTMLDivElement>(null)
    const [token, setToken] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [attempt, setAttempt] = useState(0)
    const widgetRef = useRef<string | null>(null)
    const reset = useCallback(() => {
        setToken('')
        setError(null)
        if (widgetRef.current !== null) api()?.reset(widgetRef.current)
        else {
            if (!api()) document.getElementById('cf-turnstile-script')?.remove()
            setAttempt(value => value + 1)
        }
    }, [])

    useEffect(() => {
        let disposed = false
        let timedOut = false
        let retry: ReturnType<typeof setTimeout> | undefined
        const scriptId = 'cf-turnstile-script'
        const fail = () => { if (!disposed) { setToken(''); setError('Não foi possível concluir a verificação de segurança. Tenta novamente.') } }
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script')
            script.id = scriptId
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
            script.async = true
            script.defer = true
            document.head.appendChild(script)
        }
        const tryRender = () => {
            if (disposed || timedOut) return
            const turnstile = api()
            if (turnstile && containerRef.current && widgetRef.current === null) {
                try {
                    widgetRef.current = turnstile.render(containerRef.current, {
                        sitekey: SITE_KEY, theme: 'light', language: 'pt', 'response-field': false,
                        callback: value => { if (!disposed) { setToken(value); setError(null) } },
                        'expired-callback': () => { if (!disposed) setToken('') },
                        'error-callback': fail, 'timeout-callback': fail,
                    })
                } catch { fail() }
            } else if (!turnstile) retry = setTimeout(tryRender, 300)
        }
        const script = document.getElementById(scriptId)
        script?.addEventListener('error', fail)
        const watchdog = setTimeout(() => {
            if (!api()) { timedOut = true; clearTimeout(retry); fail() }
        }, 15000)
        tryRender()
        return () => {
            disposed = true
            clearTimeout(retry)
            clearTimeout(watchdog)
            script?.removeEventListener('error', fail)
            if (widgetRef.current !== null) api()?.remove(widgetRef.current)
            widgetRef.current = null
        }
    }, [attempt])
    return { containerRef, reset, token, error }
}
