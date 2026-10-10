'use client'

import { useActionState } from 'react'
import { confirmRecovery } from '@/app/auth/actions'
import { SubmitButton } from '@/components/submit-button'

export function ConfirmRecoveryForm({ token }: { token: string }) {
  const [state, action] = useActionState(async (_state: { error: string | null }, data: FormData) => confirmRecovery(data), { error: null })
  return (
    <form action={action}>
      <input type="hidden" name="token_hash" value={token} />
      {state.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{state.error}</p>}
      <SubmitButton className="w-full rounded-xl bg-[#0F3D2E] px-4 py-3 font-semibold text-white">Continuar para nova senha</SubmitButton>
    </form>
  )
}
