'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";

export function BottomNav() {
    const pathname = usePathname();

    return (
        <div className="fixed bottom-0 z-50 flex w-full border-t border-primary-foreground/10 bg-primary backdrop-blur-lg md:hidden pb-safe">
            <div className="flex w-full justify-around py-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center space-y-1 ${isActive ? "text-accent font-bold" : "text-white/60 hover:text-white"
                                }`}
                        >
                            <item.icon className="h-6 w-6" />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
