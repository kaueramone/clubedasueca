'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function BottomNav({ pendingCount = 0, userId, initialChatUnread = 0 }: {
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
            .channel(`bottomnav-chat-badge-${userId}`)
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

    if (pathname.includes('/play/') || pathname.includes('/training')) {
        return null;
    }

    const friendPending = Math.max(0, pendingCount - initialChatUnread)

    return (
        <div className="fixed bottom-0 z-50 flex w-full border-t border-[#123F33] bg-[#0B1F1A] shadow-[0_-5px_15px_-5px_rgba(0,0,0,0.3)] backdrop-blur-lg md:hidden pb-safe">
            <div className="flex w-full justify-around py-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const badgeCount = item.name === "Chat" ? (chatUnread + friendPending) : 0
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center space-y-1 transition-colors relative ${isActive ? "text-accent font-bold" : "text-white hover:text-white"}`}
                        >
                            <div className="relative">
                                <item.icon className="h-6 w-6" />
                                {badgeCount > 0 && (
                                    <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[9px] min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center font-bold">
                                        {badgeCount > 9 ? '9+' : badgeCount}
                                    </span>
                                )}
                            </div>
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
