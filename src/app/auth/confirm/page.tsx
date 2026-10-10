import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ConfirmRecoveryForm } from '@/components/auth/confirm-recovery-form'
import { validRecoveryToken } from '@/features/auth/recovery'

export const metadata = { referrer: 'no-referrer' as const, robots: { index: false, follow: false } }

// Email scanners may fetch this page repeatedly. Only the submitted action verifies the OTP.
export default async function ConfirmRecoveryPage({ searchParams }: {
  searchParams: Promise<{ token_hash?: string | string[]; type?: string | string[] }>
}) {
  const { token_hash: token, type } = await searchParams
  if (!validRecoveryToken(token) || type !== 'recovery') redirect('/update-password?error=invalid_link')
  return (
    <main className="flex min-h-screen items-center justify-center bg-ios-gray6 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <p className="mb-3 text-sm font-semibold text-[#0F3D2E]">Clube da Sueca</p>
        <h1 className="text-2xl font-bold text-gray-900">Recuperar acesso</h1>
        <p className="mb-6 mt-3 text-gray-600">Continue para escolher a sua nova senha.</p>
        <ConfirmRecoveryForm token={token as string} />
        <Link href="/forgot-password" className="mt-5 block text-center text-sm text-gray-700 underline">Pedir outro email</Link>
      </div>
    </main>
  )
}
