'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cameraCrop, cameraError } from '@/lib/identity-camera'

export function IdentityCamera({ side, passport = false, onCapture, onClose }: {
  side: 'front' | 'back'; passport?: boolean; onCapture: (file: File) => void; onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)
  const guide = useRef<HTMLDivElement>(null)
  const active = useRef(false)
  const capturing = useRef(false)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const label = passport ? 'página de identificação' : side === 'front' ? 'frente' : 'verso'

  useEffect(() => {
    active.current = true
    let cancelled = false
    let stream: MediaStream | undefined
    const modal = dialog.current
    const player = video.current
    const previousFocus = document.activeElement
    modal?.showModal()
    const cancel = (event: Event) => { event.preventDefault(); onClose() }
    const hide = () => { if (document.hidden) onClose() }
    modal?.addEventListener('cancel', cancel)
    document.addEventListener('visibilitychange', hide)
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera unavailable')
        const acquired = await navigator.mediaDevices.getUserMedia({
          audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        })
        if (cancelled) { acquired.getTracks().forEach(track => track.stop()); return }
        stream = acquired
        if (player) { player.srcObject = acquired; await player.play() }
      } catch (e) {
        stream?.getTracks().forEach(track => track.stop())
        if (!cancelled) setError(cameraError(e))
      }
    }
    void start()
    return () => {
      active.current = false
      cancelled = true
      stream?.getTracks().forEach(track => track.stop())
      if (player) player.srcObject = null
      modal?.removeEventListener('cancel', cancel)
      document.removeEventListener('visibilitychange', hide)
      modal?.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [onClose])

  async function capture() {
    const player = video.current
    const frame = guide.current
    if (!player || !frame || !ready || capturing.current) return
    capturing.current = true; setBusy(true); setError('')
    try {
      const view = player.getBoundingClientRect()
      const bounds = frame.getBoundingClientRect()
      const crop = cameraCrop(player.videoWidth, player.videoHeight, view.width, view.height, bounds.width, bounds.height)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(crop.width); canvas.height = Math.round(crop.height)
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas unavailable')
      context.drawImage(player, crop.x, crop.y, crop.width, crop.height, 0, 0, canvas.width, canvas.height)
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(result => result ? resolve(result) : reject(new Error('Capture failed')), 'image/jpeg', 0.92))
      if (active.current) { onCapture(new File([blob], `bi-${side}.jpg`, { type: 'image/jpeg' })); onClose() }
    } catch (e) { if (active.current) setError(cameraError(e)) }
    finally { capturing.current = false; if (active.current) setBusy(false) }
  }

  return <dialog ref={dialog} aria-labelledby={`camera-title-${side}`} className="fixed inset-0 m-auto w-[calc(100%-1rem)] max-w-2xl max-h-[95dvh] overflow-y-auto rounded-2xl border border-accent/40 bg-background p-0 text-foreground backdrop:bg-black/85">
    <div className="flex items-center justify-between gap-3 p-4">
      <h3 id={`camera-title-${side}`} className="font-semibold">Fotografar {label}</h3>
      <Button type="button" variant="ghost" onClick={onClose} aria-label="Fechar câmara">Fechar</Button>
    </div>
    <div className="relative isolate h-[min(55dvh,28rem)] overflow-hidden bg-black">
      <video ref={video} autoPlay muted playsInline onLoadedData={() => setReady(true)} className="absolute inset-0 h-full w-full object-cover" aria-label={`Câmara para a ${label} do BI`} />
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
        <div ref={guide} style={{ aspectRatio: passport ? '125 / 88' : '85.6 / 53.98' }} className="relative w-[86%] max-w-[min(86%,60dvh)] rounded-xl border-2 border-amber-300 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
          <div className="absolute inset-x-1/3 inset-y-0 border-x border-white/35" />
          <div className="absolute inset-y-1/3 inset-x-0 border-y border-white/35" />
          <span className="absolute -top-8 left-0 right-0 text-center text-sm font-semibold text-white">{passport ? 'PÁGINA DE IDENTIFICAÇÃO' : side === 'front' ? 'FRENTE' : 'VERSO'}</span>
        </div>
      </div>
    </div>
    <div className="space-y-3 p-4">
      <p className="text-sm text-muted-foreground">Encaixe o cartão inteiro na moldura. Use boa luz, evite reflexos e mantenha o telemóvel firme.</p>
      {!ready && !error ? <p role="status" className="text-sm">A abrir a câmara… Autorize o acesso no navegador.</p> : null}
      {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
      <Button type="button" size="lg" className="w-full" disabled={!ready || busy || !!error} onClick={capture}>{busy ? 'A preparar fotografia…' : 'Capturar fotografia'}</Button>
      <p className="text-xs text-muted-foreground">Confira a fotografia no perfil antes de salvar. Pode fotografar novamente se necessário.</p>
    </div>
  </dialog>
}
