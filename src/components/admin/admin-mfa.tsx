'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ShieldCheck, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'

type Factor = { id: string; friendly_name?: string }
type Enrollment = { id: string; qr: string; secret: string }
const factorName = 'Clube da Sueca Admin'

export function AdminMfa() {
    const [client] = useState(() => createClient())
    const [factors, setFactors] = useState<Factor[]>([])
    const [factorId, setFactorId] = useState('')
    const [enrollment, setEnrollment] = useState<Enrollment | null>(null)
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [ready, setReady] = useState(false)
    const [error, setError] = useState('')
    const inFlight = useRef(false)

    useEffect(() => {
        let active = true
        async function load() {
            try {
                const [listed, assurance] = await Promise.all([client.auth.mfa.listFactors(), client.auth.mfa.getAuthenticatorAssuranceLevel()])
                if (listed.error || assurance.error) throw new Error('load')
                if (!active) return
                const verified = listed.data.totp.filter(f => f.status === 'verified')
                setFactors(verified)
                setFactorId(verified[0]?.id || '')
                setReady(assurance.data.currentLevel === 'aal2' && verified.length > 0)
            } catch {
                if (active) setError('Não foi possível consultar a segurança da conta. Recarregue a página para tentar novamente.')
            } finally { if (active) setLoading(false) }
        }
        void load()
        return () => { active = false }
    }, [client])

    async function startEnrollment() {
        if (inFlight.current) return
        inFlight.current = true; setBusy(true); setError('')
        try {
            const listed = await client.auth.mfa.listFactors()
            if (listed.error) throw listed.error
            // Never remove a verified factor. Only discard unfinished setups created by this screen.
            if (listed.data.totp.some(f => f.status === 'verified')) {
                window.location.reload()
                return
            }
            for (const factor of listed.data.all.filter(f => f.factor_type === 'totp' && f.status === 'unverified' && f.friendly_name === factorName)) {
                const removed = await client.auth.mfa.unenroll({ factorId: factor.id })
                if (removed.error) throw removed.error
            }
            const result = await client.auth.mfa.enroll({ factorType: 'totp', friendlyName: factorName, issuer: 'Clube da Sueca' })
            if (result.error) throw result.error
            const qr = result.data.totp.qr_code
            setEnrollment({ id: result.data.id, qr: qr.startsWith('data:image/') ? qr : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qr)}`, secret: result.data.totp.secret })
            setFactorId(result.data.id)
            setCode('')
        } catch { setError('Não foi possível iniciar a configuração. Tente novamente ou termine sessão e volte a entrar.') }
        finally { inFlight.current = false; setBusy(false) }
    }

    async function verify(event: React.FormEvent) {
        event.preventDefault()
        if (inFlight.current || !factorId || !/^\d{6}$/.test(code)) return
        inFlight.current = true; setBusy(true); setError('')
        try {
            const result = await client.auth.mfa.challengeAndVerify({ factorId, code })
            if (result.error) throw result.error
            setEnrollment(null); setCode(''); setReady(true)
            // Full navigation ensures that every server component uses the upgraded session.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign('/admin')
        } catch { setCode(''); setError('Código inválido ou expirado. Use o código atual do autenticador e confirme que a hora do telemóvel está automática.') }
        finally { inFlight.current = false; setBusy(false) }
    }

    return <Card className="p-6 sm:p-8 space-y-6">
        <div className="flex items-start gap-3">
            <ShieldCheck className="h-8 w-8 shrink-0 text-accent" aria-hidden="true" />
            <div><h1 className="text-2xl font-serif font-bold">Segurança administrativa</h1>
                <p className="mt-2 text-muted-foreground">O acesso à administração exige palavra-passe e um código do seu autenticador.</p></div>
        </div>
        {loading ? <p role="status" className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />A verificar a conta…</p> : ready ? <div className="space-y-4">
            <p role="status" className="text-success">Segundo fator confirmado nesta sessão.</p>
            <Link href="/admin" className="inline-block rounded-md bg-accent px-5 py-3 font-semibold text-accent-foreground">Entrar na administração</Link>
        </div> : <>
            {factors.length === 0 && !enrollment ? <div className="space-y-4">
                <p>Abra uma aplicação como Google Authenticator, Microsoft Authenticator ou 2FAS no seu telemóvel. Depois, inicie a configuração e leia o QR code.</p>
                <Button onClick={startEnrollment} disabled={busy}>{busy ? 'A preparar…' : 'Configurar autenticador'}</Button>
            </div> : null}
            {enrollment ? <div className="space-y-4">
                <p>1. No autenticador, adicione uma conta e leia este QR code.</p>
                {/* An image, never inline SVG markup. The secret is held only in component memory. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrollment.qr} alt="QR code privado para associar o autenticador" width={240} height={240} className="rounded-lg bg-white p-3" />
                <details><summary className="cursor-pointer font-medium">Não consegue ler o QR code?</summary><p className="mt-2 text-sm">Introduza esta chave manualmente no autenticador. Guarde-a num local seguro e não a envie ao apoio.</p><code className="mt-2 block break-all select-all rounded bg-muted p-3">{enrollment.secret}</code></details>
                <p>2. Introduza o código de seis dígitos mostrado na aplicação.</p>
            </div> : null}
            {factorId ? <form onSubmit={verify} className="space-y-4">
                {factors.length > 1 ? <div><label htmlFor="mfa-factor" className="block mb-2 font-medium">Autenticador</label><select id="mfa-factor" value={factorId} onChange={e => setFactorId(e.target.value)} className="w-full rounded border border-input bg-background p-3">{factors.map((factor, i) => <option key={factor.id} value={factor.id}>{factor.friendly_name || `Autenticador ${i + 1}`}</option>)}</select></div> : null}
                <label htmlFor="mfa-code" className="block font-medium">Código do autenticador</label>
                <Input id="mfa-code" name="mfa-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} className="max-w-xs text-xl tracking-widest" placeholder="000000" aria-describedby="mfa-help" disabled={busy} />
                <p id="mfa-help" className="text-sm text-muted-foreground">O código muda periodicamente. Não envie códigos ou QR codes pelo chat.</p>
                <Button type="submit" disabled={busy || code.length !== 6}>{busy ? 'A confirmar…' : enrollment ? 'Ativar MFA e entrar' : 'Confirmar e entrar'}</Button>
            </form> : null}
        </>}
        {error ? <p role="alert" className="text-danger">{error}</p> : null}
        <p className="text-sm text-muted-foreground">Se perder o autenticador, contacte <a className="underline" href="mailto:contacto@clubedasueca.co.mz">contacto@clubedasueca.co.mz</a>. A recuperação exige confirmação da identidade pelo responsável da plataforma.</p>
        <Link href="/dashboard/profile" className="inline-block text-sm underline">Voltar ao perfil</Link>
    </Card>
}
