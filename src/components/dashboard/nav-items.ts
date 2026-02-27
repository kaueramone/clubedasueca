import { Home, Wallet, Gamepad2, User, Settings, HelpCircle, History, Gift, Users } from "lucide-react";

export const navItems = [
    {
        name: "Início",
        href: "/dashboard",
        icon: Home,
    },
    {
        name: "Jogar",
        href: "/dashboard/play",
        icon: Gamepad2,
    },
    {
        name: "Carteira",
        href: "/dashboard/wallet",
        icon: Wallet,
    },
    {
        name: "Bónus",
        href: "/dashboard/bonuses",
        icon: Gift,
    },
    {
        name: "Afiliados",
        href: "/dashboard/affiliates",
        icon: Users,
    },
    {
        name: "Histórico",
        href: "/dashboard/history",
        icon: History,
    },
    {
        name: "Suporte",
        href: "/dashboard/support",
        icon: HelpCircle,
    },
];
