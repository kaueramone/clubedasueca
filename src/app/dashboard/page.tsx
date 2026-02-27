import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Wallet, Joystick, BookOpen } from "lucide-react";
import { WalletOverview } from "@/components/dashboard/wallet-overview";
import { BannerDisplay } from "@/components/dashboard/banner-display";

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
        // Self-healing: Create profile if missing
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
        // Self-healing: Create wallet if missing
        const { data: newWallet, error: walletError } = await supabase
            .from("wallets")
            .insert({
                user_id: user.id,
                balance: 0.00,
                currency: 'EUR'
            })
            .select()
            .single();

        if (!walletError) wallet = newWallet;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-foreground">
                    Olá, {profile?.username ? profile.username.split(" ")[0] : "Jogador"}!
                </h1>
                <div className="h-10 w-10 overflow-hidden rounded-full bg-ios-gray4">
                    {profile?.avatar_url && <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />}
                </div>
            </div>

            {/* Banners Widget */}
            <BannerDisplay position="dashboard_top" />

            {/* Wallet Card */}
            <WalletOverview initialBalance={wallet?.balance || 0} userId={user.id} />

            {/* Main Actions */}
            <div className="grid gap-4 md:grid-cols-2">
                <Link href="/dashboard/play" className="group relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-border">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Joystick className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Jogar Sueca</h3>
                            <p className="text-sm text-muted-foreground">Encontrar mesa ou criar</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/history" className="group relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-border">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Histórico</h3>
                            <p className="text-sm text-muted-foreground">Jogos e transações</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/training" className="group relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-border">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                            <Joystick className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Treino (Bots)</h3>
                            <p className="text-sm text-muted-foreground">Praticar sem apostar</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/tutorial" className="group relative overflow-hidden rounded-2xl bg-card p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-border">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-foreground">Como Jogar</h3>
                            <p className="text-sm text-muted-foreground">Regras e Dicas</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Recent Activity (Placeholder) */}
            {/* Recent Activity (Placeholder) */}
            <div className="rounded-2xl bg-card p-6 shadow-sm border border-border">
                <h3 className="font-bold text-foreground">Atividade Recente</h3>
                <div className="mt-4 flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                    <p>Sem atividade recente.</p>
                </div>
            </div>
        </div>
    );
}
