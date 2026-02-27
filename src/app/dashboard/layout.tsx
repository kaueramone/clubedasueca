import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signout } from "../auth/actions";
import { LogOut } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { UserPresence } from "@/components/dashboard/user-presence";
import ChatWidget from "@/components/chat/chat-widget";

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

    return (
        <div className="flex h-screen bg-ios-gray6">
            <UserPresence userId={user.id} email={user.email || ''} />
            <Sidebar userEmail={user.email} />
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden">
                    <div className="relative w-32 h-8">
                        <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                        <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                    </div>
                    <div className="flex items-center gap-2">
                        <Link href="/dashboard/profile" className="flex items-center justify-center h-8 w-8 rounded-full bg-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-300 transition-colors">
                            EU
                        </Link>
                        <form action={signout}>
                            <button className="text-ios-red p-2">
                                <LogOut className="h-5 w-5" />
                            </button>
                        </form>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pb-20 md:pb-0 p-4 md:p-8">
                    {children}
                </main>
            </div>
            <BottomNav />
            <ChatWidget userId={user.id} />
        </div>
    );
}
