import Link from "next/link";
import Image from "next/image";

export function GlobalFooter({ hideGameLinks = false }: { hideGameLinks?: boolean }) {
    return (
        <footer className="border-t border-border bg-background pt-16 pb-12">
            <div className="container mx-auto px-4">
                <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <div className="relative w-52 h-14 mb-4 block">
                            <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" />
                            <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Jogue Sueca com amigos em Moçambique. Beta com créditos fictícios e sem cobrança.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-foreground mb-4">Sobre</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/p/como-funciona" className="hover:text-accent transition-colors">Como funciona?</Link></li>
                            <li><Link href="/p/deposito-saque" className="hover:text-accent transition-colors">Créditos de teste</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-foreground mb-4">O Jogo</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {!hideGameLinks && (
                                <li><Link href="/demo" className="hover:text-accent transition-colors">Jogar Partida de Treino</Link></li>
                            )}
                            <li><Link href="/blog" className="hover:text-accent transition-colors">O Nosso Blog</Link></li>
                            {!hideGameLinks && (
                                <li><Link href="/register" className="hover:text-accent transition-colors">Criar Conta no Clube</Link></li>
                            )}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-foreground mb-4">Legal</h3>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/p/termos" className="hover:text-accent transition-colors">Termos de Utilização</Link></li>
                            <li><Link href="/p/privacidade" className="hover:text-accent transition-colors">Política de Privacidade</Link></li>
                            <li><Link href="/p/kyc" className="hover:text-accent transition-colors">Identidade e fase de testes</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 border-t border-border pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                    <p>© {new Date().getFullYear()} Clube da Sueca. Todos os direitos reservados.</p>
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        <span className="inline-flex items-center gap-2"><Image src="/images/flags/pt.svg" alt="Bandeira de Portugal" width={28} height={21} />Portugal</span>
                        <span className="inline-flex items-center gap-2"><Image src="/images/flags/mz.svg" alt="Bandeira de Moçambique" width={28} height={21} />Moçambique</span>
                        <span>Plataforma para maiores de 18 anos (+18)</span>
                    </div>
                </div>
            </div>
        </footer>
    );
}
