'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";
import Image from 'next/image'
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function Sidebar({ userEmail, pendingCount = 0, userId, initialChatUnread = 0 }: {
    userEmail?: string
    pendingCount?: number
    userId?: string
    initialChatUnread?: number
}) {
    const pathname = usePathname();
    const [chatUnread, setChatUnread] = useState(initialChatUnread)

    useEffect(() => {
        if (pathname === '/dashboard/chat') setChatUnread(0)
    }, [pathname])

    useEffect(() => {
        if (!userId) return
        const supabase = createClient()
        const channel = supabase
            .channel(`sidebar-chat-badge-${userId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'chat_messages',
                filter: `receiver_id=eq.${userId}`,
            }, () => {
                if (pathname !== '/dashboard/chat') {
                    setChatUnread(prev => prev + 1)
                }
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [userId, pathname])

    const friendPending = Math.max(0, pendingCount - initialChatUnread)

    return (
        <div className="hidden h-full w-64 flex-col border-r border-[#123F33] bg-[#0B1F1A] md:flex">
            <div className="flex h-16 items-center justify-center px-6 border-b border-[#123F33] shrink-0">
                <Link href="/dashboard" className="relative w-full h-8">
                    <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain" priority />
                </Link>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const badgeCount = item.name === "Chat" ? (chatUnread + friendPending) : 0
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                                isActive
                                    ? "bg-white/10 text-accent font-bold border border-white/20 shadow-sm"
                                    : "text-white hover:bg-white/10"
                            )}
                        >
                            <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-accent" : "text-white"}`} />
                            {item.name}
                            {badgeCount > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] min-w-[20px] h-5 px-1 rounded-full flex items-center justify-center font-bold">
                                    {badgeCount > 99 ? '99+' : badgeCount}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {userEmail === 'kaueramone@live.com' && (
                    <Link
                        href="/admin"
                        className="group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-white/70 hover:bg-danger/20 hover:text-white mt-4 border border-dashed border-danger/40"
                    >
                        <ShieldAlert className="mr-3 h-5 w-5 flex-shrink-0 text-danger" />
                        Admin Access
                    </Link>
                )}
            </nav>
        </div>
    );
}
