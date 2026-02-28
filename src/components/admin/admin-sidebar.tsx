import Link from 'next/link'
import { Home, Users, BarChart2, MessageSquare, Image as ImageIcon, FileText, Gift, Award, Shield, DollarSign } from 'lucide-react'

import Image from 'next/image'

export function AdminSidebar() {
    return (
        <aside className="w-64 bg-card border-r border-border min-h-screen p-4 flex flex-col font-sans">
            <div className="mb-8 px-4">
                <Link href="/admin">
                    <div className="relative w-full h-12">
                        <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                        <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                    </div>
                </Link>
            </div>

            <nav className="flex-1 space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-4">Geral</div>
                <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <Home className="h-5 w-5" />
                    Dashboard
                </Link>
                <Link href="/admin/crm" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <BarChart2 className="h-5 w-5" />
                    CRM & Métricas
                </Link>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 px-4">Gestão</div>
                <Link href="/admin/users" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <Users className="h-5 w-5" />
                    Utilizadores
                </Link>
                <Link href="/admin/transactions" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <DollarSign className="h-5 w-5" />
                    Transações
                </Link>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 px-4">Crescimento</div>
                <Link href="/admin/bonuses" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <Gift className="h-5 w-5" />
                    Bónus & Promos
                </Link>
                <Link href="/admin/affiliates" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <Award className="h-5 w-5" />
                    Afiliados
                </Link>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 px-4">Conteúdo</div>
                <Link href="/admin/banners" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <ImageIcon className="h-5 w-5" />
                    Banners
                </Link>
                <Link href="/admin/cms" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    Blog & SEO
                </Link>

                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-6 px-4">Suporte</div>
                <Link href="/admin/chat" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-primary/5 hover:text-primary transition-colors">
                    <MessageSquare className="h-5 w-5" />
                    Live Chat
                </Link>
            </nav>

            <div className="mt-8 pt-4 border-t border-border px-4">
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors bg-muted/50 border border-border/50">
                    Voltar ao Jogo
                </Link>
            </div>
        </aside>
    )
}
