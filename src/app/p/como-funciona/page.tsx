import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShieldCheck, Trophy, ArrowRightLeft } from 'lucide-react';

export default function ComoFuncionaPage() {
    return (
        <div className="min-h-screen bg-background font-sans">
            {/* Header Simples (mantém a navegação para os não logados ou apenas logo) */}
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur h-16 flex items-center justify-center">
                <Link href="/" className="relative w-40 h-10">
                    <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                    <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                </Link>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-accent mb-4">Como Funciona O Jogo</h1>
                    <p className="text-xl text-muted-foreground">O único Clube 100% focado na Tradição da Sueca Portuguesa.</p>
                </div>

                {/* Steps */}
                <div className="space-y-16">
                    {/* Step 1 */}
                    <div className="flex flex-col md:flex-row gap-8 items-center bg-card p-8 rounded-3xl border border-border shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-bold text-accent">1</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
                                <ArrowRightLeft className="text-accent h-6 w-6" /> Entrar na Mesa
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Pode jogar gratuitamente no modo "Treino" para afiar as suas habilidades ou sentar-se nas mesas a dinheiro real usando o saldo da sua carteira. Os jogos iniciam mal os 4 lugares fiquem ocupados e os parceiros são atribuídos de frente a frente.
                            </p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="flex flex-col md:flex-row gap-8 items-center bg-card p-8 rounded-3xl border border-border shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-bold text-accent">2</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
                                <ShieldCheck className="text-accent h-6 w-6" /> Regras Clássicas & Fair Play
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Aplicamos escrupulosamente a Tradição. É obrigatório dar pelo naipe de saída (assistir) se possuir essa carta em mão. A "Renúncia" detetada causa alerta imediato e em modos torneio confisca a partida à equipa infratora. O trunfo é decidido automaticamente pela base do baralho cortado.
                            </p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="flex flex-col md:flex-row gap-8 items-center bg-card p-8 rounded-3xl border border-border shadow-sm">
                        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                            <span className="text-2xl font-bold text-accent">3</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-foreground mb-3 flex items-center gap-2">
                                <Trophy className="text-accent h-6 w-6" /> Premiação Otimizada (<span className="text-green-500">20% Rake</span>)
                            </h2>
                            <p className="text-muted-foreground leading-relaxed">
                                Fiel a um clube noturno, a equipa que alcançar 61 ou mais pontos arrecada o Pote. A plataforma efetua uma retenção de segurança e manutenção denominada "Taxa de Mesa" (Rake de 20%) sobre o valor bruto do pote gerado, premiando o saldo líquido na hora.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="mt-20 text-center">
                    <Link href="/register">
                        <Button variant="primary" size="lg" className="h-14 px-10 text-lg shadow-xl hover:scale-105 transition-transform duration-300">
                            Entendido. Criar Conta!
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}
