'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils"; // We need to create utils or just use template literals

import { ShieldAlert } from "lucide-react"; // Add import

import Image from 'next/image'

export function Sidebar({ userEmail }: { userEmail?: string }) {
    const pathname = usePathname();

    return (
        <div className="hidden h-full w-64 flex-col border-r border-border/10 bg-primary md:flex">
            <div className="flex h-20 items-center justify-center px-6 border-b border-primary-foreground/10">
                <Link href="/dashboard" className="relative w-full h-12">
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
                                ? "bg-white/10 text-white border border-white/20 shadow-sm"
                                : "text-white/70 hover:bg-white/5 hover:text-white"
                                }`}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-accent" : "text-white/50 group-hover:text-white/80"
                                    }`}
                            />
                            {item.name}
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
            <div className="border-t border-primary-foreground/10 p-4">
                <div className="bg-accent/10 border border-accent/20 rounded-xl p-3 flex flex-col gap-1 text-center">
                    <span className="text-xs font-semibold text-accent/80 uppercase tracking-widest">Saldo Atual</span>
                    <span className="text-xl font-bold text-accent">€ 0.00</span>
                </div>
            </div>
        </div>
    );
}
