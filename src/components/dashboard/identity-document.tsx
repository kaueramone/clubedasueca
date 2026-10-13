'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BI_CONSENT_VERSION, DOCUMENT_TYPES, type DocumentType, type IdentityRecord } from '@/lib/identity-document'
import { IdentityCamera } from '@/components/dashboard/identity-camera'

// Private signed images must bypass the shared Next image optimizer/cache.
/* eslint-disable @next/next/no-img-element */
function PhotoUpload({ side, file, onChange, passport = false }: { side: 'front' | 'back'; file: File | null; onChange: (file: File | null) => void; passport?: boolean }) {
  const preview = useRef<HTMLImageElement>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const closeCamera = useCallback(() => setCameraOpen(false), [])
  useEffect(() => {
    const image = preview.current
    if (!file || !image) return
    const url = URL.createObjectURL(file)
    image.src = url
    return () => { image.removeAttribute('src'); URL.revokeObjectURL(url) }
  }, [file])
  const label = passport ? 'Página de identificação' : side === 'front' ? 'Frente' : 'Verso'
  return <div className="rounded-xl border-2 border-accent/50 bg-accent/5 p-4 space-y-3">
    <label htmlFor={`bi-${side}`} className="block font-semibold">{label}</label>
    <Button type="button" className="w-full" onClick={() => setCameraOpen(true)}>{file ? 'Fotografar novamente' : 'Abrir câmara'} · {label}</Button>
    <p className="text-xs text-muted-foreground">Ou escolha uma fotografia da galeria:</p>
    <input id={`bi-${side}`} type="file" accept="image/jpeg,image/png,image/webp"
      className="block w-full cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-3 file:font-bold file:text-accent-foreground hover:file:bg-accent/80 focus-visible:outline-2 focus-visible:outline-accent"
      onChange={e => onChange(e.target.files?.[0] || null)} />
    {file ? <img ref={preview} alt={`${label} selecionada para guardar`} className="h-40 w-full rounded-lg object-contain bg-black/20" /> : <p className="text-xs text-muted-foreground">Use a câmara ou escolha uma fotografia.</p>}
    {cameraOpen ? <IdentityCamera side={side} passport={passport} onCapture={onChange} onClose={closeCamera} /> : null}
  </div>
}

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
  const [documentType, setDocumentType] = useState<DocumentType>('id')
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
    setMessage(''); setError(''); setConsent(false)
  }
  async function save() {
    if (!front || (documentType !== 'passport' && !back) || lock.current) return
    if (!consent) { setError('Confirme a autorização para ler e guardar o seu BI.'); return }
    lock.current = true; setBusy(true); setError(''); setMessage('A preparar a leitura…')
    try {
      const { prepareIdentityPhotos } = await import('@/lib/prepare-identity-photos')
      const photos = await prepareIdentityPhotos(front, back)
      if (!active.current) return
      setMessage('A extrair os dados com Gemini e a salvar o BI…')
      const form = new FormData()
      form.set('front', photos[0], 'front.jpg'); if (photos[1]) form.set('back', photos[1], 'back.jpg')
      form.set('document_type', documentType)
      form.set('consent', BI_CONSENT_VERSION)
      if (record) form.set('revision', record.revision)
      const savedResponse = await fetch(endpoint, { method: 'POST', body: form })
      const data = await savedResponse.json()
      if (!savedResponse.ok) throw new Error(data.error || 'Não foi possível guardar o BI.')
      if (active.current) {
        setFront(null); setBack(null); setConsent(false)
        inputs.current?.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => { input.value = '' })
        setMessage('Documento e dados salvos na sua ficha. Validação para créditos concluída.')
      }
      try { await load() } catch {
        if (active.current) setMessage('BI salvo. Atualize a página para consultar as fotografias e os dados guardados.')
      }
    } catch (e) { if (active.current) { setMessage(''); setError(e instanceof Error ? e.message : 'Não foi possível guardar o BI.') } }
    finally { lock.current = false; if (active.current) setBusy(false) }
  }
  const displayed = record
  return <Card className="p-6 space-y-5">
    <div><h2 className="text-xl font-serif font-bold">Documento de identificação</h2>
      <p className="text-sm text-muted-foreground mt-2">BI, passaporte, Cartão de Cidadão ou título de residência com fotografia e validade. Dados e imagens guardados de forma privada.</p></div>
    {loading ? <p role="status">A consultar o BI…</p> : record ? <div className="rounded-lg bg-muted p-4">
      <p className="font-semibold">{record.expired ? 'Documento expirado — importe o documento renovado.' : 'Documento registado · Dentro da validade indicada'}</p>
      {!userId ? <p role="status" className="mt-2 text-sm">{record.credit_error || 'Idade, validade, fotografia e nome conferidos. Pode adicionar créditos.'}</p> : null}
      <p className="text-sm text-muted-foreground">Autenticidade não verificada. Último envio: {new Date(record.submitted_at).toLocaleDateString('pt-MZ')}.</p>
      <div className="flex gap-4 mt-3 text-sm underline"><a href={record.front_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Ver documento</a>{record.back_url ? <a href={record.back_url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer">Ver verso</a> : null}</div>
      <div className="grid gap-4 sm:grid-cols-2 mt-4">
        <figure><img key={record.front_url} src={record.front_url} alt="Frente do BI guardado" referrerPolicy="no-referrer" className="h-44 w-full rounded-lg bg-black/20 object-contain" /><figcaption className="text-xs mt-2">Frente guardada</figcaption></figure>
        {record.back_url ? <figure><img key={record.back_url} src={record.back_url} alt="Verso do BI guardado" referrerPolicy="no-referrer" className="h-44 w-full rounded-lg bg-black/20 object-contain" /><figcaption className="text-xs mt-2">Verso guardado</figcaption></figure> : null}
      </div>
      <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => { setError(''); void load().catch(e => setError(e.message)) }}>Atualizar acesso aos anexos</Button>
    </div> : <p className="text-sm">Ainda não foi anexado um BI.</p>}
    {displayed ? <dl className="grid gap-4 sm:grid-cols-2 text-sm">
      {([['Tipo de documento', DOCUMENT_TYPES[displayed.document_type as DocumentType]], ['País emissor', displayed.country], ['Nome no documento', displayed.full_name], ['Número do documento', displayed.document_number], ['Nascimento no documento', displayDate(displayed.birth_date)], ['Válido até', displayDate(displayed.expiry_date)]]).map(([label, value]) => <div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="font-semibold break-words mt-1">{value}</dd></div>)}
    </dl> : null}
    {!userId ? <>
      <fieldset ref={inputs} disabled={busy || loading} className="space-y-4">
        <legend className="font-semibold mb-3">{record ? 'Substituir documento' : 'Importar documento'}</legend>
        <label className="block text-sm font-semibold" htmlFor="identity-document-type">Tipo de documento</label>
        <select id="identity-document-type" value={documentType} className="w-full rounded-lg border border-border bg-background p-3" onChange={e => { setDocumentType(e.target.value as DocumentType); changePhoto('front', null); changePhoto('back', null); inputs.current?.querySelectorAll<HTMLInputElement>('input[type=file]').forEach(input => { input.value = '' }) }}>
          {Object.entries(DOCUMENT_TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <p className="text-sm">Para adicionar créditos, o documento deve indicar pelo menos 18 anos, estar dentro da validade e ter fotografia. O nome deve corresponder ao Nome Completo do perfil.</p>
        <p className="text-sm text-muted-foreground">Fotografe as duas faces por inteiro, com boa luz e sem reflexos. JPG, PNG ou WebP até 20 MB por face. As imagens são ajustadas para guardar até 2 MB por face.</p>
        <div className="grid gap-4 sm:grid-cols-2"><PhotoUpload side="front" passport={documentType === 'passport'} file={front} onChange={file => changePhoto('front', file)} />{documentType !== 'passport' ? <PhotoUpload side="back" file={back} onChange={file => changePhoto('back', file)} /> : null}</div>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={consent} onChange={e => setConsent(e.target.checked)} /><span>Confirmo que este documento é meu e autorizo o envio das fotografias ao Google Gemini para extração dos campos e o armazenamento privado das imagens e dos dados na minha ficha, acessíveis a mim e aos administradores para gestão da conta.</span></label>
        <p className="text-xs text-muted-foreground">Ao clicar em Salvar documento, o Gemini extrai os campos e a plataforma confere idade, validade, fotografia e nome antes de guardar. Confira os dados apresentados após salvar. Esta leitura não comprova a autenticidade do documento.</p>
        <Button type="button" size="lg" className="w-full sm:w-auto" disabled={busy || !front || (documentType !== 'passport' && !back) || !consent} onClick={save}>{busy ? 'A ler e salvar…' : 'Salvar documento'}</Button>
      </fieldset>
    </> : null}
    <p role="status" aria-live="polite" className="text-sm">{message}</p>
    {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
  </Card>
}
