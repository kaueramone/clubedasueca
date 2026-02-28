import { getBlogPosts } from '@/features/cms/actions';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, User, Eye } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'O Blog da Tradição | Clube da Sueca',
    description: 'Notícias, dicas, guias estratégicos e atualizações sobre o mundo da sueca portuguesa.',
};

export default async function BlogIndexPage() {
    const posts = await getBlogPosts(20);

    const formatData = (dateStr: string) => {
        return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
    };

    const heroPost = posts.length > 0 ? posts[0] : null;
    const regularPosts = posts.length > 1 ? posts.slice(1) : [];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background font-sans">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 dark:bg-background/95 backdrop-blur h-16 flex items-center justify-center">
                <Link href="/" className="relative w-40 h-10">
                    <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                    <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                </Link>
            </header>

            <main className="container mx-auto px-4 py-16 max-w-6xl">
                <div className="mb-16 md:text-center md:mx-auto max-w-3xl">
                    <h1 className="text-4xl md:text-6xl font-serif font-bold text-gray-900 dark:text-foreground tracking-tight mb-4">
                        O Blog da Tradição
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-muted-foreground leading-relaxed">
                        Atualizações globais da plataforma, manuais para iniciantes e reportagens sobre a sueca digital.
                    </p>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center py-20 bg-white dark:bg-card border border-border rounded-3xl p-8">
                        <p className="text-muted-foreground text-lg">Ainda não existem artigos publicados. Volta mais tarde!</p>
                    </div>
                ) : (
                    <>
                        {/* HERO POST (Destaque) */}
                        {heroPost && (
                            <Link href={`/blog/${heroPost.slug}`} className="group block mb-12 bg-white dark:bg-card rounded-[2rem] overflow-hidden shadow-sm border border-border hover:shadow-xl transition-all duration-300">
                                <div className="flex flex-col md:flex-row">
                                    <div className="relative w-full md:w-3/5 aspect-video md:aspect-auto bg-gray-100 overflow-hidden border-r border-border">
                                        {heroPost.cover_image ? (
                                            <img src={heroPost.cover_image} alt={heroPost.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-10 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]">
                                                <div className="text-primary font-serif font-bold text-6xl md:text-8xl rotate-12">CS</div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-8 md:p-12 md:w-2/5 flex flex-col justify-center">
                                        {heroPost.tags && heroPost.tags.length > 0 && (
                                            <div className="mb-4">
                                                <span className="inline-block text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-3 py-1 rounded-full">
                                                    {heroPost.tags[0]}
                                                </span>
                                            </div>
                                        )}
                                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-foreground mb-4 group-hover:text-primary transition-colors">
                                            {heroPost.title}
                                        </h2>
                                        <p className="text-gray-600 dark:text-muted-foreground text-lg mb-8 line-clamp-3">
                                            {heroPost.excerpt || 'Leia a notícia na íntegra no nosso portal...'}
                                        </p>
                                        <div className="flex items-center justify-between text-sm text-gray-500 mt-auto">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                                                    {(heroPost.author as any)?.avatar_url ? (
                                                        <img src={(heroPost.author as any).avatar_url} alt="autor" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                                                            {String((heroPost.author as any)?.username || 'C').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-gray-900 dark:text-gray-200">{(heroPost.author as any)?.username || 'Equipa CS'}</p>
                                                    <time className="text-xs">{formatData(heroPost.created_at)}</time>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs">
                                                <Eye className="w-4 h-4" /> {heroPost.views || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        {/* GRID POSTS SECUNDÁRIOS */}
                        {regularPosts.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {regularPosts.map((post) => (
                                    <Link href={`/blog/${post.slug}`} key={post.id} className="group flex flex-col bg-white dark:bg-card rounded-3xl overflow-hidden shadow-sm border border-border hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                                        <div className="relative w-full h-48 bg-primary/5 overflow-hidden border-b border-border">
                                            {post.cover_image ? (
                                                <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center opacity-10 bg-[radial-gradient(#10B981_1px,transparent_1px)] [background-size:16px_16px]">
                                                    <div className="text-primary font-serif font-bold text-6xl rotate-12">CS</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="p-6 flex-1 flex flex-col">
                                            {post.tags && post.tags.length > 0 && (
                                                <div className="mb-3">
                                                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-1 rounded-full">
                                                        {post.tags[0]}
                                                    </span>
                                                </div>
                                            )}

                                            <h3 className="text-xl font-bold text-gray-900 dark:text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                                                {post.title}
                                            </h3>

                                            <p className="text-gray-600 dark:text-muted-foreground text-sm line-clamp-3 mb-6 flex-1">
                                                {post.excerpt || 'Ver detalhes...'}
                                            </p>

                                            <div className="flex items-center justify-between text-xs text-gray-500 mt-auto pt-4 border-t border-border">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{(post.author as any)?.username || 'Equipa CS'}</span>
                                                </div>
                                                <time className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatData(post.created_at)}</time>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}
