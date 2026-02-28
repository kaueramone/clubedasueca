import Image from 'next/image';
import Link from 'next/link';

export default function DocumentStaticPage({ title, lastUpdated, children }: { title: string, lastUpdated: string, children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background font-sans">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 dark:bg-background/95 backdrop-blur h-16 flex items-center justify-center">
                <Link href="/" className="relative w-40 h-10">
                    <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                    <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                </Link>
            </header>

            <main className="container mx-auto px-4 py-20 max-w-3xl">
                <article className="prose prose-stone dark:prose-invert max-w-none bg-white dark:bg-card p-10 md:p-16 rounded-3xl shadow-sm border border-border">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{title}</h1>
                    <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-12">Atualizado a {lastUpdated}</p>

                    <div className="text-foreground/80 leading-relaxed space-y-6">
                        {children}
                    </div>
                </article>
            </main>
        </div>
    );
}
