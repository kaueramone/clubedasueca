import { BetaNotice } from '@/components/beta-notice'
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GlobalHeader } from "@/components/layout/global-header";
import { GlobalFooter } from "@/components/layout/global-footer";


export default async function Home({ searchParams }: { searchParams: Promise<{ code?: string; error?: string }> }) {
    const params = await searchParams;
    // Supabase can fall back to Site URL for old/unlisted email redirects.
    if (params.code) redirect(`/auth/callback?${new URLSearchParams({ code: params.code })}`);
    if (params.error) redirect('/auth/auth-code-error');
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (session) {
        redirect("/dashboard");
    }



    return (
        <div className="min-h-screen bg-background flex flex-col font-sans">
            {/* Header */}
            <GlobalHeader isLoggedIn={!!session} />

            <BetaNotice />
            {/* Hero Section */}
            <main className="flex-1">
                <section className="relative overflow-hidden py-24 sm:py-32 lg:pb-40">
                    <div className="absolute inset-0 z-0 overflow-hidden">
                        <Image src="/images/partida-luso-mocambicana.png" alt="Partida de Sueca entre Portugal e Moçambique" fill sizes="100vw" className="object-cover opacity-65" priority />

                        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/65 to-background" />
                    </div>
                    <div className="container mx-auto px-4 relative z-10">
                        <div className="mx-auto max-w-3xl text-center flex flex-col items-center">

                            <div className="relative w-52 h-52 sm:w-64 sm:h-64 mb-6 drop-shadow-2xl">
                                <Image src="/images/clubedasueca-fundoclaro-perfil.png" alt="Logo Clube da Sueca" fill className="object-contain dark:hidden" priority />
                                <Image src="/images/clubedasueca-fundoescuro-perfil.png" alt="Logo Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                            </div>

                            <div className="mb-8 inline-flex items-center rounded-full border border-accent/30 bg-background/50 backdrop-blur-md px-3 py-1 text-sm font-medium text-accent shadow-sm">
                                <span className="flex h-2 w-2 rounded-full bg-accent mr-2 animate-pulse" />
                                Sueca online para Moçambique · Beta
                            </div>
                            <h1 className="text-5xl font-serif font-bold tracking-tight text-foreground sm:text-7xl mb-6">
                                A sua mesa de <br className="hidden sm:block" />
                                <span className="text-accent">Sueca Online</span>
                            </h1>
                            <p className="text-lg leading-8 text-muted-foreground mb-10 max-w-2xl mx-auto">
                                Jogue Sueca em dupla, pratique com bots e experimente as mesas online. Durante o beta, todos os créditos são fictícios e gratuitos.
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
                            <p className="mt-4 text-lg text-muted-foreground">Quatro jogadores, duas equipas e a tradição da Sueca no seu telemóvel.</p>
                        </div>
                        <div className="grid sm:grid-cols-3 gap-8 max-w-5xl mx-auto">
                            <div className="bg-background rounded-2xl p-8 border border-border shadow-sm text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <span className="text-2xl">♠️</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">Tradição Pura</h3>
                                <p className="text-muted-foreground">Baralho de 40 cartas, equipas de dois e obrigação de assistir ao naipe.</p>
                            </div>
                            <div className="bg-background rounded-2xl p-8 border border-border shadow-sm text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                                    <span className="text-2xl">🏆</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">Treino e mesas online</h3>
                                <p className="text-muted-foreground">Aprenda com bots na demonstração e junte-se a outros jogadores nas mesas do beta.</p>
                            </div>
                            <div className="bg-background rounded-2xl p-8 border border-border shadow-sm text-center">
                                <div className="mx-auto h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                                    <span className="text-2xl">🤝</span>
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-foreground">Comunidade</h3>
                                <p className="text-muted-foreground">Convide amigos, encontre parceiros e partilhe a sua experiência com o suporte.</p>
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* FAQ Section */}
            <section className="py-24 bg-background">
                <div className="container mx-auto px-4">
                    <div className="mx-auto max-w-3xl text-center mb-16">
                        <h2 className="text-3xl font-serif font-bold text-foreground sm:text-4xl text-accent">Perguntas frequentes</h2>
                        <p className="mt-4 text-lg text-muted-foreground">Tudo o que precisa saber para entrar no jogo.</p>
                    </div>
                    <div className="max-w-3xl mx-auto space-y-6">
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Posso jogar grátis?</h3>
                            <p className="text-muted-foreground">Sim. Você pode abrir uma conta e experimentar o modo de Treino contra bots totalmente de graça para se acostumar com a interface e com as regras clássicas da sueca.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Como funcionam os prémios?</h3>
                            <p className="text-muted-foreground">Os resultados movimentam apenas créditos de teste, sem valor monetário. Não existem prémios em dinheiro nem levantamentos no beta. Todos os saldos serão repostos a zero no lançamento oficial.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Em que fase está a plataforma?</h3>
                            <p className="text-muted-foreground">Estamos a testar a plataforma. A operação com dinheiro real aguarda aprovação da licença em Moçambique e a contratação de um prestador de pagamentos. Partilhe eventuais falhas com o suporte.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Existe taxa?</h3>
                            <p className="text-muted-foreground">Nas mesas de teste, a taxa simulada é de 20% do pote. Exemplo: quatro entradas de 100 créditos formam 400; a equipa vencedora recebe 320, ou 160 por jogador. No empate, cada entrada é devolvida e a taxa é zero. Não há cobrança.</p>
                        </div>
                        <div className="bg-card p-6 rounded-2xl border border-border">
                            <h3 className="text-lg font-bold text-foreground mb-2">Posso jogar no telemóvel?</h3>
                            <p className="text-muted-foreground">Pode jogar pelo navegador do telemóvel, sem instalar uma aplicação. A experiência está em testes e precisa de ligação à internet.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Final */}
            <section className="py-24 bg-card border-t border-border relative overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <Image src="/images/partida-luso-mocambicana.png" alt="Mesa de Sueca luso-moçambicana" fill sizes="100vw" className="object-cover opacity-25" />
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
            <GlobalFooter />
        </div>
    );
}
