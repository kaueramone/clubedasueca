import { Sidebar } from "@/components/dashboard/sidebar";
import { BottomNav } from "@/components/dashboard/bottom-nav";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { signout } from "../auth/actions";
import { LogOut } from "lucide-react";

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
            <Sidebar userEmail={user.email} />
            <div className="flex flex-1 flex-col overflow-hidden">
                {/* Mobile Header */}
                <header className="flex h-14 items-center justify-between border-b bg-white px-4 md:hidden">
                    <span className="font-bold">ApostaNaSueca</span>
                    <form action={signout}>
                        <button className="text-ios-red">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </form>
                </header>

                <main className="flex-1 overflow-y-auto pb-20 md:pb-0 p-4 md:p-8">
                    {children}
                </main>
            </div>
            <BottomNav />
        </div>
    );
}
