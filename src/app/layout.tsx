import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: 'swap' });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair", display: 'swap' });

export const metadata: Metadata = {
    title: "Clube da Sueca | O Seu Clube Privado Desta Tradição Portuguesa",
    description: "Jogue Sueca Online num ambiente premium e confiável.",
    alternates: {
        canonical: 'https://clubedasueca.pt',
        languages: {
            'pt-PT': 'https://clubedasueca.pt',
            'pt-BR': 'https://clubedasueca.com.br',
            'x-default': 'https://clubedasueca.com',
        },
    },
    openGraph: {
        siteName: 'Clube da Sueca',
        type: 'website',
        locale: 'pt_PT',
        alternateLocale: ['pt_BR'],
    },
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    const lang = host.includes('.com.br') ? 'pt-BR' : 'pt-PT';

    return (
        <html lang={lang} className="dark">
            <body className={`${inter.variable} ${playfair.variable} font-sans min-h-screen bg-background text-foreground`}>
                {children}
            </body>
        </html>
    );
}
