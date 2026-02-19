'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./nav-items";
import { cn } from "@/lib/utils"; // We need to create utils or just use template literals

import { ShieldAlert } from "lucide-react"; // Add import

export function Sidebar({ userEmail }: { userEmail?: string }) {
    const pathname = usePathname();

    return (
        <div className="hidden h-full w-64 flex-col border-r bg-white md:flex">
            <div className="flex h-16 items-center px-6">
                <h1 className="text-xl font-bold bg-gradient-to-r from-ios-blue to-ios-purple bg-clip-text text-transparent">
                    ApostaNaSueca
                </h1>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${isActive
                                ? "bg-ios-blue text-white shadow-md shadow-ios-blue/25"
                                : "text-gray-700 hover:bg-ios-gray6 hover:text-gray-900"
                                }`}
                        >
                            <item.icon
                                className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-500"
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
                        className="group flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-gray-700 hover:bg-red-50 hover:text-red-600 mt-4 border border-dashed border-red-200"
                    >
                        <ShieldAlert className="mr-3 h-5 w-5 flex-shrink-0 text-red-500" />
                        Admin Access
                    </Link>
                )}
            </nav>
            <div className="border-t p-4">
                {/* User profile summary or logout could go here */}
            </div>
        </div>
    );
}
