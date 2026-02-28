import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";

export function GlobalHeader({
    isLoggedIn = false,
    hideSignup = false
}: {
    isLoggedIn?: boolean;
    hideSignup?: boolean;
}) {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <Link href="/" className="relative w-40 h-10">
                    <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                    <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                </Link>
                <nav className="flex items-center gap-4">
                    {isLoggedIn ? (
                        <Link href="/dashboard">
                            <Button variant="primary" size="sm" className="flex items-center gap-2">
                                <span className="h-6 w-6 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold">EU</span>
                                A Minha Conta
                            </Button>
                        </Link>
                    ) : (
                        <>
                            <Link href="/login" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                                Entrar
                            </Link>
                            {!hideSignup && (
                                <Link href="/register" className="hidden sm:block">
                                    <Button variant="primary" size="sm" className="hidden sm:flex">
                                        Criar Conta
                                    </Button>
                                </Link>
                            )}
                            <Link href="/login" className="sm:hidden">
                                <Button variant="primary" size="sm" className="font-bold text-xs h-8 px-4 rounded-xl shadow-lg">
                                    Entrar
                                </Button>
                            </Link>
                        </>
                    )}
                </nav>
            </div>
        </header>
    );
}
