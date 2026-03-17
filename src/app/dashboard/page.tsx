import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Joystick, BookOpen, History, Users } from "lucide-react";
import { WalletOverview } from "@/components/dashboard/wallet-overview";
import { BannerDisplay } from "@/components/dashboard/banner-display";
import { GlobalChat } from "@/components/dashboard/global-chat";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    let { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (!profile) {
        const { data: newProfile, error: profileError } = await supabase
            .from("profiles")
            .insert({
                id: user.id,
                username: user.user_metadata.full_name || user.email?.split("@")[0] || "Jogador",
                avatar_url: user.user_metadata.avatar_url,
            })
            .select()
            .single();
        if (!profileError) profile = newProfile;
    }

    let { data: wallet } = await supabase
        .from("wallets")
        .select("*")
        .eq("user_id", user.id)
        .single();

    if (!wallet) {
        const { data: newWallet, error: walletError } = await supabase
            .from("wallets")
            .insert({ user_id: user.id, balance: 0.00, currency: 'EUR' })
            .select()
            .single();
        if (!walletError) wallet = newWallet;
    }

    const firstName = profile?.username ? profile.username.split(" ")[0] : "Jogador";

    const navCards = [
        {
            href: '/dashboard/play',
            icon: <Joystick className="h-5 w-5" />,
            label: 'Jogar',
            sublabel: 'Encontrar mesa ou criar',
            color: 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground',
            badge: null,
        },
        {
            href: '/dashboard/training',
            icon: <Joystick className="h-5 w-5" />,
            label: 'Treino',
            sublabel: 'Praticar com bots',
            color: 'bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground',
            badge: 'Grátis',
        },
        {
            href: '/dashboard/chat',
            icon: <Users className="h-5 w-5" />,
            label: 'Amigos',
            sublabel: 'Chat e pedidos',
            color: 'bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white',
            badge: null,
        },
        {
            href: '/dashboard/history',
            icon: <History className="h-5 w-5" />,
            label: 'Histórico',
            sublabel: 'Jogos e transações',
            color: 'bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background',
            badge: null,
        },
        {
            href: '/dashboard/tutorial',
            icon: <BookOpen className="h-5 w-5" />,
            label: 'Tutorial',
            sublabel: 'Como jogar',
            color: 'bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white',
            badge: null,
        },
    ];

    return (
        <div className="space-y-5">
            {/* Greeting */}
            <h1 className="text-xl font-bold text-foreground">
                Olá, {firstName}! 👋
            </h1>

            {/* Main Layout: Left column + Right column (chat) */}
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-5 items-start">

                {/* LEFT: wallet + banner + nav cards */}
                <div className="space-y-5">
                    {/* Wallet + Banner row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <WalletOverview initialBalance={wallet?.balance || 0} userId={user.id} />
                        <BannerDisplay position="dashboard_top" />
                    </div>

                    {/* Quick Nav */}
                    <div>
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Acesso Rápido</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                            {navCards.map((card) => (
                                <Link
                                    key={card.href}
                                    href={card.href}
                                    className="group relative flex items-center gap-3 rounded-xl bg-card p-4 shadow-sm border border-border hover:shadow-md hover:border-accent/20 transition-all hover:scale-[1.02]"
                                >
                                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors ${card.color}`}>
                                        {card.icon}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <p className="font-bold text-foreground text-sm leading-tight">{card.label}</p>
                                            {card.badge && (
                                                <span className="text-[9px] font-black bg-accent text-accent-foreground px-1.5 py-0.5 rounded-full uppercase">{card.badge}</span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-tight mt-0.5 truncate">{card.sublabel}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                {/* RIGHT: Global Chat */}
                <div className="lg:sticky lg:top-4">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Chat da Comunidade</h2>
                    <div className="h-[420px] lg:h-[500px]">
                        <GlobalChat currentUserId={user.id} />
                    </div>
                </div>
            </div>
        </div>
    );
}
