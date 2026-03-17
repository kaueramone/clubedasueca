import Link from "next/link";
import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ kicked?: string }> }) {
    const { kicked } = await searchParams
    return (
        <div className="flex min-h-screen items-center justify-center bg-ios-gray6 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
                {kicked && (
                    <div className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800 text-center">
                        <strong>Sessão encerrada.</strong><br />A tua conta foi acedida noutro dispositivo.
                    </div>
                )}
                <div className="mb-8 text-center flex flex-col items-center">
                    <Link href="/">
                        <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca Logo" width={220} height={60} className="mb-6 hover:opacity-90 transition-opacity" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Bem-vindo de volta</h1>
                    <p className="text-ios-gray">Inicie sessão na sua conta</p>
                </div>

                <LoginForm />

                <p className="mt-8 text-center text-sm text-gray-500">
                    Não tem conta?{" "}
                    <Link
                        href="/register"
                        className="font-semibold text-accent hover:text-accent/80"
                    >
                        Registar
                    </Link>
                </p>
            </div>
        </div>
    );
}
