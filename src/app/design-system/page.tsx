import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"

export default function DesignSystemShowcase() {
    return (
        <div className="min-h-screen bg-background text-foreground p-8 space-y-12 max-w-5xl mx-auto">

            <header className="border-b border-border pb-8">
                <h1 className="text-4xl font-serif font-bold text-primary mb-2">Clube da Sueca — Design System</h1>
                <p className="text-muted-foreground text-lg">
                    Ambiente premium, tradicional português, inspirado na verdadeira mesa de feltro verde.
                </p>
                <div className="mt-4 flex gap-2">
                    <Badge variant="vip-bronze">VIP Bronze</Badge>
                    <Badge variant="vip-silver">VIP Silver</Badge>
                    <Badge variant="vip-gold">VIP Gold</Badge>
                    <Badge variant="vip-platinum">VIP Platinum</Badge>
                </div>
            </header>

            {/* Colors Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold border-b border-border pb-2">Paleta de Cores (Themes)</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-background border border-border flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="font-bold">Background</span>
                        <span className="text-xs text-muted-foreground mt-1 text-foreground">Off-White (Light) / Verde 900 (Dark)</span>
                    </div>
                    <div className="p-4 rounded-lg bg-primary text-primary-foreground flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="font-bold">Primary</span>
                        <span className="text-xs opacity-80 mt-1">Verde Mesa 800</span>
                    </div>
                    <div className="p-4 rounded-lg bg-accent text-accent-foreground shadow-premium flex flex-col items-center justify-center text-center">
                        <span className="font-bold">Accent</span>
                        <span className="text-xs opacity-80 mt-1">Dourado Premium</span>
                    </div>
                    <div className="p-4 rounded-lg bg-danger text-danger-foreground flex flex-col items-center justify-center text-center shadow-sm">
                        <span className="font-bold">Danger</span>
                        <span className="text-xs opacity-80 mt-1">Vermelho Controlado</span>
                    </div>
                </div>
            </section>

            {/* Typography Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold border-b border-border pb-2">Tipografia Clássica</h2>
                <div className="space-y-4 bg-card p-6 rounded-xl border border-border shadow-sm">
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Heading 1 (Playfair Display)</p>
                        <h1 className="text-4xl font-serif font-bold">O Maior Torneio de Sueca em Portugal</h1>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Heading 2</p>
                        <h2 className="text-2xl font-serif font-semibold">Salas Privadas VIP</h2>
                    </div>
                    <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Body Text (Inter)</p>
                        <p className="leading-relaxed">A Sueca joga-se com 4 jogadores divididos em duas equipas. Cada jogador recebe 10 cartas do baralho de 40. O objetivo é somar 120 pontos, ganhando as vazas que contêm os Ases (11), Setes (10), Reis (4), Valetes (3) e Damas (2).</p>
                    </div>
                </div>
            </section>

            {/* Buttons Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold border-b border-border pb-2">Botões e Interações</h2>
                <div className="flex flex-wrap gap-4 items-center p-6 rounded-xl bg-card border border-border shadow-sm">
                    <Button variant="primary" size="lg">Jogar Agora (Primary)</Button>
                    <Button variant="secondary">Criar Mesa (Secondary)</Button>
                    <Button variant="outline">Ver Regras (Outline)</Button>
                    <Button variant="danger">Sair da Mesa (Danger)</Button>
                    <Button variant="ghost">Cancelar</Button>
                </div>
            </section>

            {/* Forms Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold border-b border-border pb-2">Inputs e Formulários</h2>
                <div className="max-w-md space-y-4 p-6 rounded-xl bg-card border border-border shadow-sm">
                    <div>
                        <label className="text-sm font-medium mb-1 block">Email do Clube</label>
                        <Input type="email" placeholder="jogador@clubedasueca.io" />
                    </div>
                    <div>
                        <label className="text-sm font-medium mb-1 block text-danger">Palavra-passe Inválida</label>
                        <Input type="password" placeholder="••••••••" error defaultValue="123" />
                    </div>
                    <Button variant="primary" className="w-full mt-2">Entrar no Clube</Button>
                </div>
            </section>

            {/* Cards Section */}
            <section className="space-y-4">
                <h2 className="text-2xl font-serif font-semibold border-b border-border pb-2">Cards e Mesas</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Torneio de Lisboa</CardTitle>
                            <CardDescription>Mesa de alto risco. Apenas jogadores VIP Gold ou superior.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="flex justify-between items-center py-2 border-b border-border">
                                <span className="text-muted-foreground">Prémio Base</span>
                                <span className="font-bold text-accent">€ 5.000,00</span>
                            </div>
                            <div className="flex justify-between items-center py-2 border-b border-border">
                                <span className="text-muted-foreground">Entrada</span>
                                <span>€ 50,00</span>
                            </div>
                            <div className="flex justify-between items-center py-2">
                                <span className="text-muted-foreground">Jogadores</span>
                                <span>12 / 16 (Equipas)</span>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="primary" className="w-full">Registar Equipa</Button>
                        </CardFooter>
                    </Card>

                    <Card className="bg-primary text-primary-foreground border-transparent shadow-premium relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 font-serif text-8xl">♠️</div>
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-serif text-2xl font-bold text-accent">Mesa Privada #892</h3>
                                    <p className="text-sm text-primary-foreground/80 mt-1">A aguardar jogadores...</p>
                                </div>
                                <Badge variant="outline" className="border-accent text-accent">Amigável</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex -space-x-3 my-4">
                                <div className="w-10 h-10 rounded-full border-2 border-primary bg-background text-foreground flex items-center justify-center text-xs font-bold">EU</div>
                                <div className="w-10 h-10 rounded-full border-2 border-primary bg-background text-foreground flex items-center justify-center text-xs font-bold">PL</div>
                                <div className="w-10 h-10 rounded-full border-2 border-primary bg-background/50 flex items-center justify-center text-xs text-background/50 border-dashed">?</div>
                                <div className="w-10 h-10 rounded-full border-2 border-primary bg-background/50 flex items-center justify-center text-xs text-background/50 border-dashed">?</div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full border-transparent bg-background text-foreground hover:bg-background/90 hover:text-foreground">Sentar na Mesa</Button>
                        </CardFooter>
                    </Card>
                </div>
            </section>

        </div>
    )
}
