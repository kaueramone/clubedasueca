'use client'

import { useCallback, useEffect, useRef } from 'react'

type Turnstile = {
    render: (container: HTMLElement, options: { sitekey: string; theme: string }) => string
    reset: (id: string) => void
    remove: (id: string) => void
}
const api = () => (window as Window & { turnstile?: Turnstile }).turnstile
const SITE_KEY = '0x4AAAAAACsNPdO_nwmclG_7'

export function useTurnstile() {
    const containerRef = useRef<HTMLDivElement>(null)
    const widgetRef = useRef<string | null>(null)
    const reset = useCallback(() => {
        if (widgetRef.current !== null) api()?.reset(widgetRef.current)
    }, [])

    useEffect(() => {
        let disposed = false
        let retry: ReturnType<typeof setTimeout> | undefined
        const scriptId = 'cf-turnstile-script'
        if (!document.getElementById(scriptId)) {
            const script = document.createElement('script')
            script.id = scriptId
            script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
            script.async = true
            script.defer = true
            document.head.appendChild(script)
        }
        const tryRender = () => {
            if (disposed) return
            const turnstile = api()
            if (turnstile && containerRef.current && widgetRef.current === null) {
                widgetRef.current = turnstile.render(containerRef.current, { sitekey: SITE_KEY, theme: 'light' })
            } else if (!turnstile) retry = setTimeout(tryRender, 300)
        }
        tryRender()
        return () => {
            disposed = true
            clearTimeout(retry)
            if (widgetRef.current !== null) api()?.remove(widgetRef.current)
            widgetRef.current = null
        }
    }, [])
    return { containerRef, reset }
}
