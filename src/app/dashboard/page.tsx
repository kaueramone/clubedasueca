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
                <h1 className="text-2xl font-bold text-gray-900">
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
                <Link href="/dashboard/play" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                            <Joystick className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Jogar Sueca</h3>
                            <p className="text-sm text-gray-500">Encontrar mesa ou criar</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/history" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                            <Wallet className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Histórico</h3>
                            <p className="text-sm text-gray-500">Jogos e transações</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/training" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100 text-yellow-600 group-hover:bg-yellow-600 group-hover:text-white transition-colors">
                            <Joystick className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Treino (Bots)</h3>
                            <p className="text-sm text-gray-500">Praticar sem apostar</p>
                        </div>
                    </div>
                </Link>

                <Link href="/dashboard/tutorial" className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-md hover:scale-[1.01] border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-accent group-hover:bg-accent/90 group-hover:text-white transition-colors">
                            <BookOpen className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Como Jogar</h3>
                            <p className="text-sm text-gray-500">Regras e Dicas</p>
                        </div>
                    </div>
                </Link>
            </div>

            {/* Recent Activity (Placeholder) */}
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-900">Atividade Recente</h3>
                <div className="mt-4 flex flex-col items-center justify-center py-8 text-center text-gray-500">
                    <p>Sem atividade recente.</p>
                </div>
            </div>
        </div>
    );
}
