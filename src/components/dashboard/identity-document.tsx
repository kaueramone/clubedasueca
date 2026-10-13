'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BI_CONSENT_VERSION, type IdentityFields, type IdentityRecord } from '@/lib/identity-document'

const endpoint = '/api/profile/identity'
const displayDate = (value: string) => value.split('-').reverse().join('/')
export function IdentityDocument({ userId }: { userId?: string }) {
  const [record, setRecord] = useState<IdentityRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [fields, setFields] = useState<IdentityFields | null>(null)
  const [photos, setPhotos] = useState<Blob[]>([])
  const active = useRef(true)
  const lock = useRef(false)
  const inputs = useRef<HTMLFieldSetElement>(null)
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`${endpoint}${userId ? `?userId=${encodeURIComponent(userId)}` : ''}`, { cache: 'no-store', signal })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Não foi possível consultar o BI.')
    if (active.current) setRecord(data.document)
  }, [userId])
  useEffect(() => {
    active.current = true
    const controller = new AbortController()
    load(controller.signal).catch(e => { if (!controller.signal.aborted) setError(e.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => { active.current = false; controller.abort() }
  }, [load])
  function changePhoto(side: 'front' | 'back', file: File | null) {
    if (side === 'front') setFront(file); else setBack(file)
    setFields(null); setPhotos([]); setMessage(''); setError(''); setConsent(false)
  }
  async function scan() {
    if (!front || !back || lock.current) return
    if (!consent) { setError('Confirme a autorização para ler e guardar o seu BI.'); return }
    lock.current = true; setBusy(true); setError(''); setFields(null); setPhotos([]); setMessage('A preparar a leitura…')
    try {
      const response = await fetch(`${endpoint}?config=1`, { cache: 'no-store' })
      const config = await response.json()
      if (!response.ok) throw new Error(config.error)
      const { readIdentityDocument } = await import('@/lib/read-identity-document')
      const result = await readIdentityDocument(front, back, config.licenseKey, setMessage, () => !active.current)
      if (active.current) { setFields(result.fields); setPhotos(result.photos); setMessage('Leitura concluída. Confira os dados e guarde o BI.') }
    } catch (e) { if (active.current) { setMessage(''); setError(e instanceof Error ? e.message : 'Não foi possível ler o BI.') } }
    finally { lock.current = false; if (active.current) setBusy(false) }
  }
  async function save() {
    if (!fields || photos.length !== 2 || !consent || lock.current) return
    lock.current = true; setBusy(true); setError(''); setMessage('A guardar o BI…')
    try {
      const form = new FormData()
      form.set('front', photos[0], 'front.jpg'); form.set('back', photos[1], 'back.jpg')
      form.set('fields', JSON.stringify(fields)); form.set('consent', BI_CONSENT_VERSION)
      if (record) form.set('revision', record.revision)
      const response = await fetch(endpoint, { method: 'POST', body: form })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Não foi possível guardar o BI.')
      if (active.current) {
        setFields(null); setPhotos([]); setFront(null); setBack(null); setConsent(false)
        inputs.current?.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => { input.value = '' })
        setMessage('BI guardado na sua ficha. Autenticidade não verificada.')
      }
      await load()
    } catch (e) { if (active.current) { setMessage(''); setError(e instanceof Error ? e.message : 'Não foi possível guardar o BI.') } }
    finally { lock.current = false; if (active.current) setBusy(false) }
  }
  const displayed = fields || record
  return <Card className="p-6 space-y-5">
    <div><h2 className="text-xl font-serif font-bold">Bilhete de Identidade</h2>
      <p className="text-sm text-muted-foreground mt-2">Frente, verso e dados do BI de Moçambique, guardados de forma privada na ficha do utilizador.</p></div>
    {loading ? <p role="status">A consultar o BI…</p> : record ? <div className="rounded-lg bg-muted p-4">
      <p className="font-semibold">{record.expired ? 'BI expirado — importe o documento renovado.' : 'BI registado · Dentro da validade indicada'}</p>
      <p className="text-sm text-muted-foreground">Autenticidade não verificada. Último envio: {new Date(record.submitted_at).toLocaleDateString('pt-MZ')}.</p>
      <div className="flex gap-4 mt-3 text-sm underline"><a href={record.front_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Ver frente</a><a href={record.back_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Ver verso</a></div>
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setError(''); void load().catch(e => setError(e.message)) }}>Atualizar acesso aos anexos</Button>
    </div> : <p className="text-sm">Ainda não foi anexado um BI.</p>}
    {displayed ? <dl className="grid gap-4 sm:grid-cols-2 text-sm">
      {([['Nome no BI', displayed.full_name], ['Número do BI', displayed.document_number], ['Nascimento no BI', displayDate(displayed.birth_date)], ['Válido até', displayDate(displayed.expiry_date)]]).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold break-words mt-1">{value}</dd></div>)}
    </dl> : null}
    {!userId ? <>
      <fieldset ref={inputs} disabled={busy || loading} className="space-y-4">
        <legend className="font-semibold mb-3">{record ? 'Substituir BI' : 'Importar BI'}</legend>
        <p className="text-sm text-muted-foreground">Fotografe as duas faces por inteiro, com boa luz e sem reflexos. JPG, PNG ou WebP até 20 MB por face. As imagens são ajustadas para guardar até 2 MB por face.</p>
        <div><label htmlFor="bi-front" className="block text-sm font-semibold mb-2">Frente do BI</label><input id="bi-front" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="w-full text-sm" onChange={e => changePhoto('front', e.target.files?.[0] || null)} /></div>
        <div><label htmlFor="bi-back" className="block text-sm font-semibold mb-2">Verso do BI</label><input id="bi-back" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="w-full text-sm" onChange={e => changePhoto('back', e.target.files?.[0] || null)} /></div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Confirmo que este BI é meu e autorizo a leitura e o armazenamento privado das duas faces e dos dados na minha ficha, acessíveis a mim e aos administradores para gestão da conta.</span></label>
        <p className="text-xs text-muted-foreground">A leitura extrai os campos e confere a data de validade. Não comprova a autenticidade. O leitor contacta a Microblink para licenciamento; as fotografias são guardadas na plataforma apenas após clicar em Guardar BI.</p>
        <div className="flex flex-wrap gap-3"><Button type="button" disabled={busy || !front || !back || !consent} onClick={scan}>{busy ? 'A processar…' : 'Ler dados do BI'}</Button>
          {fields ? <Button type="button" variant="secondary" disabled={busy || !consent} onClick={save}>Confirmar dados e guardar BI</Button> : null}</div>
      </fieldset>
    </> : null}
    <p role="status" aria-live="polite" className="text-sm">{message}</p>
    {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
  </Card>
}
