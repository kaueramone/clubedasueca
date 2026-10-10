import { UpdatePasswordForm } from "@/components/auth/update-password-form";
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
    const { error } = await searchParams;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const validSession = !!user && !error;
    return (
        <div className="flex min-h-screen items-center justify-center bg-ios-gray6 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">{validSession ? 'Nova senha' : 'Solicite um novo link'}</h1>
                    <p className="text-gray-600">{validSession ? 'Escolha uma nova senha segura' : 'O link é inválido, expirou ou já foi utilizado.'}</p>
                </div>

                {validSession ? <UpdatePasswordForm /> : <div className="space-y-4 text-sm text-gray-700">
                    <p>Peça outro email de recuperação e utilize o link mais recente.</p>
                    <Link href="/forgot-password" className="block rounded-xl bg-[#0F3D2E] px-4 py-3 text-center font-semibold text-white">Pedir novo link</Link>
                </div>}
            </div>
        </div>
    );
}
