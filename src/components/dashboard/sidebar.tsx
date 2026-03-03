'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils"; // We need to create utils or just use template literals

import { ShieldAlert } from "lucide-react"; // Add import

import Image from 'next/image'

export function Sidebar({ userEmail, pendingCount = 0 }: { userEmail?: string, pendingCount?: number }) {
    const pathname = usePathname();
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
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                ? "bg-white/10 text-accent font-bold border border-white/20 shadow-sm"
                                : "text-white hover:bg-white/10"
                                }`}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-accent" : "text-white"
                                    }`}
                            />
                            {item.name}
                            {item.name === "Chat" && pendingCount > 0 && (
                                <span className="ml-auto bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    );
                })}

                {/* Admin Link */}
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
