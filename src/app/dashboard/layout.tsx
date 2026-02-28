import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signout } from "../auth/actions";
import { LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { UserPresence } from "@/components/dashboard/user-presence";
import { HeaderBalance } from "@/components/dashboard/header-balance";

export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url, username')
        .eq('id', user.id)
        .single();

    const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', user.id)
        .single();

    const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
    const initial = profile?.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'E';

    return (
        <div className="flex h-screen bg-ios-gray6">
            <UserPresence userId={user.id} email={user.email || ''} />
            <Sidebar userEmail={user.email} />
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Global Dashboard Header */}
                <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6 shrink-0 shadow-sm z-20">
                    <div className="flex items-center gap-4">
                        {/* Mobile Menu Toggle could go here later if needed */}
                        <div className="relative w-32 h-8 md:hidden">
                            <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                            <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="hidden md:flex items-center gap-3">
                            <HeaderBalance initialBalance={wallet?.balance || 0} userId={user.id} />
                            <Link href="/dashboard/wallet/deposit" className="bg-success/10 text-success hover:bg-success hover:text-white transition-colors border border-success/20 px-4 py-1.5 rounded-full text-sm font-semibold shadow-sm">
                                Depositar
                            </Link>
                        </div>

                        <div className="h-6 w-px bg-border hidden md:block" />

                        <div className="flex items-center gap-2">
                            <Link href="/dashboard/profile" className="flex items-center gap-2 group">
                                <span className="hidden md:block text-sm font-medium text-foreground group-hover:text-accent transition-colors">Minha Conta</span>
                                <div className="flex items-center justify-center h-9 w-9 rounded-full bg-primary/10 border border-primary/20 text-xs font-bold text-primary group-hover:border-accent transition-colors overflow-hidden">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        initial
                                    )}
                                </div>
                            </Link>
                            <form action={signout}>
                                <button className="text-muted-foreground hover:text-danger p-2 transition-colors rounded-full hover:bg-danger/10" title="Terminar Sessão">
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </form>
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pb-20 md:pb-0 p-4 md:p-8">
                    {children}
                </main>
            </div>
            <BottomNav />
        </div>
    );
}
