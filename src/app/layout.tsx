import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: 'swap' });
export const metadata: Metadata = {
    title: "Clube da Sueca | Sueca online em Moçambique — Beta",
    description: "Jogue Sueca online com créditos fictícios, sem cobrança. Beta de testes para Moçambique.",
    openGraph: {
        siteName: 'Clube da Sueca',
        type: 'website',
        locale: 'pt_MZ',
    },
};
export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    viewportFit: 'cover',
    themeColor: '#0B1F1A',
};
export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="pt-MZ" className="dark">
            <body className={`${inter.variable} ${playfair.variable} font-sans min-h-dvh bg-background text-foreground`}>
                {children}
            </body>
        </html>
    );
}
