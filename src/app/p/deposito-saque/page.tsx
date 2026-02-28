import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Banknote, CreditCard, Clock, Lock } from 'lucide-react';

export default function DepositoSaquePage() {
    return (
        <div className="min-h-screen bg-background font-sans">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur h-16 flex items-center justify-center">
                <Link href="/" className="relative w-40 h-10">
                    <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                    <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                </Link>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-4xl">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">Depósitos & Saques</h1>
                    <p className="text-xl text-muted-foreground">O seu saldo está ao alcance de um clique. Transparente e imediato.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {/* Card Depositos */}
                    <div className="bg-card p-10 rounded-3xl border border-border flex flex-col items-center text-center shadow-sm">
                        <div className="w-20 h-20 rounded-2xl bg-success/10 flex items-center justify-center mb-6">
                            <Banknote className="h-10 w-10 text-success" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground mb-4">Depósitos</h2>
                        <ul className="space-y-4 text-left w-full text-muted-foreground mb-8">
                            <li className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-success" /> MB Way Direto (Recomendado)</li>
                            <li className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-blue-500" /> Referência Multibanco</li>
                            <li className="flex items-center gap-2"><CreditCard className="w-5 h-5 text-purple-500" /> Transferência PIX (Brasil)</li>
                        </ul>
                        <div className="mt-auto bg-background p-4 rounded-xl border border-border w-full flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">Tempo de Entrada:</span>
                            <span className="text-sm font-bold text-success flex items-center gap-1"><Clock className="w-4 h-4" /> Imediato</span>
                        </div>
                    </div>

                    {/* Card Saques */}
                    <div className="bg-card p-10 rounded-3xl border border-border flex flex-col items-center text-center shadow-sm">
                        <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-6">
                            <Lock className="h-10 w-10 text-accent" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground mb-4">Levantamentos</h2>
                        <ul className="space-y-4 text-left w-full text-muted-foreground mb-8">
                            <li className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-accent" /> Transferência Bancária IBAN</li>
                            <li className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-accent" /> Transferência PIX</li>
                            <li className="flex items-center gap-2"><ArrowRightLeft className="w-5 h-5 text-accent" /> MB Way App</li>
                        </ul>
                        <div className="mt-auto bg-background p-4 rounded-xl border border-border w-full flex items-center justify-between">
                            <span className="text-sm font-semibold text-foreground">Tempo de Saída:</span>
                            <span className="text-sm font-bold text-yellow-500 flex items-center gap-1"><Clock className="w-4 h-4" /> Até 2 horas úteis</span>
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900 rounded-2xl p-6 text-center">
                    <p className="text-blue-800 dark:text-blue-300 font-medium">Não cobramos taxas de depósito nem de levantamento nas operações primárias.</p>
                </div>

                <div className="mt-16 text-center">
                    <Link href="/dashboard/wallet/deposit">
                        <Button variant="primary" size="lg" className="h-14 px-10 text-lg shadow-xl">
                            Fazer Depósito Agora
                        </Button>
                    </Link>
                </div>
            </main>
        </div>
    );
}

// Need to import ArrowRightLeft above
import { ArrowRightLeft } from 'lucide-react';
