import Image from 'next/image';
import Link from 'next/link';
import { GlobalHeader } from "@/components/layout/global-header";
import { GlobalFooter } from "@/components/layout/global-footer";

export default function DocumentStaticPage({ title, lastUpdated, children }: { title: string, lastUpdated: string, children: React.ReactNode }) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background font-sans flex flex-col">
            <GlobalHeader hideSignup={true} />

            <main className="container mx-auto px-4 py-20 max-w-3xl flex-1">
                <article className="prose prose-stone dark:prose-invert max-w-none bg-white dark:bg-card p-10 md:p-16 rounded-3xl shadow-sm border border-border">
                    <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">{title}</h1>
                    <p className="text-sm text-muted-foreground uppercase tracking-widest font-semibold mb-12">Atualizado a {lastUpdated}</p>

                    <div className="text-foreground/80 leading-relaxed space-y-6">
                        {children}
                    </div>
                </article>
            </main>
            <GlobalFooter hideGameLinks={true} />
        </div>
    );
}
