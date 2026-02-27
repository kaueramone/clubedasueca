import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: 'swap' });

export const metadata: Metadata = {
    title: "Clube da Sueca | O Seu Clube Privado Desta Tradição Portuguesa",
    description: "Jogue Sueca Online num ambiente premium e confiável.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt" className="dark"> {/* Dark mode is default for Clube da Sueca */}
            <body className={`${inter.variable} ${playfair.variable} font-sans min-h-screen bg-background text-foreground`}>
                {children}
            </body>
        </html>
    );
}
