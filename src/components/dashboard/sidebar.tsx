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
                <Link href="/dashboard/profile" className="flex items-center gap-3 w-full p-2 hover:bg-ios-gray6 rounded-lg transition-colors group">
                    <div className="h-10 w-10 text-xs rounded-full bg-gray-200 flex items-center justify-center text-gray-500 group-hover:bg-white group-hover:shadow-sm transition-all overflow-hidden">
                        {/* We would need to fetch the avatar here or pass it down. For now, static or placeholder */}
                        <span className="font-bold">Eu</span>
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Minha Conta</p>
                        <p className="text-xs text-gray-500">Editar Perfil</p>
                    </div>
                </Link>
            </div>
        </div>
    );
}
