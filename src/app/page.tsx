import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";


export default async function Home() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        redirect("/dashboard");
    }



    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/" className="relative w-40 h-10">
                        <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                        <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                    </Link>
                    <nav className="flex items-center gap-4">
                        {session ? (
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
                                <Link href="/register" className="hidden sm:block">
                                    <Button variant="primary" size="sm" className="hidden sm:flex">
                                        Criar Conta
                                    </Button>
                                </Link>
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

            {/* Hero Section */}
            <main className="flex-1">
                <section className="relative overflow-hidden py-24 sm:py-32 lg:pb-40">
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <Image src="/images/hero-banner.png" alt="Hero Clube da Sueca" fill className="hidden sm:block object-cover opacity-30" priority />
                        {/* Mobile Background: Rotated 90 degrees vertical */}
                        <Image src="/images/hero-banner.png" alt="Hero Clube da Sueca" fill className="sm:hidden object-cover opacity-30 transform rotate-90 scale-150" priority />

                        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
                    </div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="mx-auto max-w-3xl text-center flex flex-col items-center">

                            <div className="relative w-32 h-32 mb-6 drop-shadow-2xl">
                                <Image src="/images/clubedasueca-fundoclaro-perfil.png" alt="Logo Clube da Sueca" fill className="object-contain dark:hidden" priority />
                                <Image src="/images/clubedasueca-fundoescuro-perfil.png" alt="Logo Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                            </div>

                            <div className="mb-8 inline-flex items-center rounded-full border border-accent/30 bg-background/50 backdrop-blur-md px-3 py-1 text-sm font-medium text-accent shadow-sm">
                                <span className="flex h-2 w-2 rounded-full bg-accent mr-2 animate-pulse" />
                                O Clube Tradicional Português
                            </div>
                            <h1 className="text-5xl font-serif font-bold tracking-tight text-foreground sm:text-7xl mb-6">
                                O Clube Oficial da <br className="hidden sm:block" />
                                <span className="text-accent">Sueca Online</span>
                            </h1>
                            <p className="text-lg leading-8 text-muted-foreground mb-10 max-w-2xl mx-auto">
                                Joga Sueca como sempre foi — agora com competição, ranking e prémios reais.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/register" className="w-full sm:w-auto">
                                    <Button variant="primary" size="lg" className="w-full text-lg h-14 px-8">
                                        Entrar para o Clube
                                    </Button>
                                </Link>
                                <Link href="/demo" className="w-full sm:w-auto">
                                    <Button variant="outline" size="lg" className="w-full text-lg h-14 px-8 border-accent/20 hover:border-accent hover:bg-accent/10 text-foreground hover:text-accent transition-colors">
                                        Jogar Partida de Demonstração
                                    </Button>
                                </Link>
                            </div>
                            <p className="mt-4 text-sm text-muted-foreground">
                                Sem compromisso. Jogue contra os nossos bots e sinta na pele.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Info / Cards Section */}
                <section className="py-24 bg-card border-y border-border">
                    <div className="container mx-auto px-4">
                        <div className="mx-auto max-w-2xl text-center mb-16">
                            <h2 className="text-3xl font-serif font-bold text-foreground sm:text-4xl">Porquê o Clube da Sueca?</h2>
                            <p className="mt-4 text-lg text-muted-foreground">Esqueça os sites de casino barulhentos. Aqui joga-se Sueca a sério.</p>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <div className="bg-background rounded-2xl p-8 border border-border shadow-sm text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <span className="text-2xl">♠️</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">Tradição Pura</h3>
                                <p className="text-muted-foreground">Regras clássicas de Portugal implementadas fielmente com renúncia estrita.</p>
                            </div>
                            <div className="bg-background rounded-2xl p-8 border border-border shadow-sm text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">Ambiente Premium</h3>
                                <p className="text-muted-foreground">Salas privadas e torneios de alto nível numa interface elegante e livre de distrações.</p>
                            </div>
                            <div className="bg-background rounded-2xl p-8 border border-border shadow-sm text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <span className="text-2xl">🤝</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">Comunidade</h3>
                                <p className="text-muted-foreground">Faça equipa com os seus amigos e jogue contra os melhores do país em segurança.</p>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* FAQ Section */}
            <section className="py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="mx-auto max-w-3xl text-center mb-16">
                        <h2 className="text-3xl font-serif font-bold text-foreground sm:text-4xl text-accent">FAQ Estratégico</h2>
                        <p className="mt-4 text-lg text-muted-foreground">Tudo o que precisa saber para entrar no jogo.</p>
                    </div>
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Posso jogar grátis?</h3>
                            <p className="text-muted-foreground">Sim. Você pode abrir uma conta e experimentar o modo de Treino contra bots totalmente de graça para se acostumar com a interface e com as regras clássicas da sueca.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Como funcionam os prémios?</h3>
                            <p className="text-muted-foreground">As mesas funcionam à base de prémios por partida. O vencedor (ou a equipa vencedora) recebe o pote final da mesa (deduzido de uma pequena taxa da plataforma), creditado automaticamente em saldo real na conta.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">É seguro?</h3>
                            <p className="text-muted-foreground">O Clube da Sueca garante um jogo justo (Fair Play). Usamos tecnologia de embaralhamento criptográfico RNG e algoritmos de deteção de conluio para manter a integridade total do jogo.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Existe taxa?</h3>
                            <p className="text-muted-foreground">A plataforma retém apenas um "Rake" (pequena percentagem) sobre as mesas a dinheiro real para manutenção do servidor, prize pools de torneios e desenvolvimento contínuo.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Posso jogar no telemóvel?</h3>
                            <p className="text-muted-foreground">Totalmente. O Clube da Sueca foi desenhado do zero para funcionar com 100% de fluidez em qualquer smartphone (iOS ou Android) diretamente pelo navegador, sem instalar nada.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-24 bg-card border-t border-border relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image src="/images/hero-banner.png" alt="Banner CTA" fill className="object-cover opacity-10" />
                </div>
                <div className="container mx-auto px-4 relative z-10 text-center">
                    <h2 className="text-4xl font-serif font-bold text-foreground sm:text-5xl mb-6">
                        A tradição continua. <span className="text-accent text-nowrap">Agora online.</span>
                    </h2>
                    <Link href="/register">
                        <Button variant="primary" size="lg" className="text-lg h-14 px-10 shadow-xl">
                            Entrar no Clube Hoje
                        </Button>
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border bg-background py-12">
                <div className="container mx-auto px-4">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="relative w-52 h-14 mb-4 block">
                                <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" />
                                <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Jogue a sueca portuguesa com seus amigos e coloque suas moedas na mesa.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-foreground mb-4">Sobre</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="/p/como-funciona" className="hover:text-accent transition-colors">Como funciona?</Link></li>
                                <li><Link href="/p/deposito-saque" className="hover:text-accent transition-colors">Deposito e Saque</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-bold text-foreground mb-4">O Jogo</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="/demo" className="hover:text-accent transition-colors">Jogar Partida de Treino</Link></li>
                                <li><Link href="/blog" className="hover:text-accent transition-colors">O Nosso Blog</Link></li>
                                <li><Link href="/register" className="hover:text-accent transition-colors">Criar Conta no Clube</Link></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-bold text-foreground mb-4">Legal</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li><Link href="/p/termos" className="hover:text-accent transition-colors">Termos de Utilização</Link></li>
                                <li><Link href="/p/privacidade" className="hover:text-accent transition-colors">Política de Privacidade</Link></li>
                                <li><Link href="/p/kyc" className="hover:text-accent transition-colors">Políticas KYC & AML</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="mt-12 border-t border-border pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                        <p>© {new Date().getFullYear()} Clube da Sueca. Todos os direitos reservados.</p>
                        <p>Plataforma para maiores de 18 anos (+18)</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
