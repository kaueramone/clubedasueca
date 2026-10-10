import Link from 'next/link'

export default function AuthCodeError() {
  return <main className="flex min-h-screen items-center justify-center bg-ios-gray6 p-4">
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl space-y-5 text-gray-900">
      <h1 className="text-2xl font-bold">Não foi possível validar o link</h1>
      <p className="text-sm text-gray-600">O link pode ter expirado ou já ter sido utilizado. Peça um novo email e abra o link mais recente.</p>
      <Link href="/forgot-password" className="block rounded-xl bg-[#0F3D2E] px-4 py-3 text-center text-sm font-semibold text-white">Recuperar senha</Link>
      <Link href="/login" className="block text-center text-sm text-gray-700 underline">Voltar ao login</Link>
    </div>
  </main>
}
