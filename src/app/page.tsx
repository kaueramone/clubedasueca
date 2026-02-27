import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllPages } from "@/features/cms/actions";

export default async function Home() {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        redirect('/dashboard');
    }

    // Fetch CMS Pages for Footer Links
    const pagesResponse = await getAllPages();
    const cmsPages = pagesResponse.pages || [];

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
                        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                            Entrar
                        </Link>
                        <Link href="/register">
                            <Button variant="primary" size="sm" className="hidden sm:flex">
                                Criar Conta
                            </Button>
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Hero Section */}
            <main className="flex-1">
                <section className="relative overflow-hidden py-24 sm:py-32 lg:pb-40">
                    <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-primary/10" />
                    <div className="container mx-auto px-4 relative">
                        <div className="mx-auto max-w-3xl text-center">
                            <div className="mb-8 inline-flex items-center rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                                <span className="flex h-2 w-2 rounded-full bg-accent mr-2 animate-pulse" />
                                O Clube Tradicional Português
                            </div>
                            <h1 className="text-5xl font-serif font-bold tracking-tight text-foreground sm:text-7xl mb-6">
                                Jogue Sueca com <br className="hidden sm:block" />
                                <span className="text-accent">Elegância e Tradição</span>
                            </h1>
                            <p className="text-lg leading-8 text-muted-foreground mb-10 max-w-2xl mx-auto">
                                Junte-se à mesa de feltro verde mais exclusiva de Portugal. Prove a sua mestria contra jogadores reais num ambiente premium, seguro e onde a estratégia dita as regras.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link href="/register" className="w-full sm:w-auto">
                                    <Button variant="primary" size="lg" className="w-full text-lg h-14 px-8">
                                        Entrar para o Clube
                                    </Button>
                                </Link>
                                <Link href="/demo" className="w-full sm:w-auto">
                                    <Button variant="outline" size="lg" className="w-full text-lg h-14 px-8 border-accent/20 hover:border-accent hover:bg-accent/10 text-foreground">
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

            {/* Footer */}
            <footer className="border-t border-border bg-background py-12">
                <div className="container mx-auto px-4">
                    <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                            <div className="relative w-40 h-10 mb-4 block">
                                <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" />
                                <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                O ecossistema premium de jogos de cartas tradicionais portugueses.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-bold text-foreground mb-4">Institucional</h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {cmsPages.filter((p: any) => p.is_published).slice(0, 4).map((page: any) => (
                                    <li key={page.id}>
                                        <Link href={`/p/${page.slug}`} className="hover:text-accent transition-colors">
                                            {page.title}
                                        </Link>
                                    </li>
                                ))}
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
