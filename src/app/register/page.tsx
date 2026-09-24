import Link from "next/link";
import Image from "next/image";
import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-ios-gray6 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
                <div className="mb-8 text-center flex flex-col items-center">
                    <Link href="/">
                        <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca Logo" width={220} height={60} className="mb-6 hover:opacity-90 transition-opacity" />
                    </Link>
                    <h1 className="text-2xl font-bold text-gray-900">Criar Conta</h1>
                    <p className="text-primary font-medium mt-1">Junte-se ao Clube da Sueca</p>
                </div>

                <div className="mb-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
                    Apenas para maiores de 18 anos. Esta é uma fase de testes, com créditos gratuitos e sem dinheiro real.
                    Os créditos não podem ser levantados e todos os saldos serão repostos a zero no lançamento oficial.
                </div>
                <p className="mb-5 text-sm text-gray-600">
                    Antes de criar a conta, consulta os <Link href="/p/termos" className="underline">termos de utilização</Link> e a <Link href="/p/privacidade" className="underline">política de privacidade</Link>.
                </p>
                <RegisterForm />

                <p className="mt-8 text-center text-sm text-gray-500">
                    Já tem conta?{" "}
                    <Link
                        href="/login"
                        className="font-semibold text-accent hover:text-accent/80"
                    >
                        Entrar
                    </Link>
                </p>
            </div>
        </div>
    );
}
