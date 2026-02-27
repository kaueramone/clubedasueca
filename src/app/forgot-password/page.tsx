import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-ios-gray6 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
                <div className="mb-8 text-center">
                    <h1 className="text-2xl font-bold text-gray-900">Recuperar Password</h1>
                    <p className="text-ios-gray">Introduza o seu email para recuperar a conta</p>
                </div>

                <ForgotPasswordForm />

                <div className="mt-8 text-center">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-accent hover:text-accent/80"
                    >
                        Voltar ao Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
