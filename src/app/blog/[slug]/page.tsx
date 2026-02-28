import { getBlogPostBySlug, getSeoSettings } from '@/features/cms/actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Calendar, User, Eye, ArrowLeft, Clock } from 'lucide-react';
import { Metadata } from 'next';

// Next.js dynamic metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const post = await getBlogPostBySlug(params.slug);
    if (!post) return {};

    const seo = await getSeoSettings(`/blog/${params.slug}`);

    return {
        title: seo?.title || `${post.title} | Blog Clube da Sueca`,
        description: seo?.description || post.excerpt || `Artigo sobre ${post.title}`,
        openGraph: {
            title: seo?.title || post.title,
            description: seo?.description || post.excerpt,
            images: seo?.og_image ? [seo.og_image] : (post.cover_image ? [post.cover_image] : []),
        }
    };
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = await getBlogPostBySlug(params.slug);

    if (!post) {
        notFound();
    }

    const wordCount = post.content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    const formatData = (dateStr: string) => {
        return new Intl.DateTimeFormat('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(dateStr));
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-background font-sans pb-24">
            {/* Header Mínimo */}
            <header className="sticky top-0 z-50 w-full border-b border-border bg-white/95 dark:bg-background/95 backdrop-blur h-16 flex items-center px-4 md:px-8">
                <Link href="/blog" className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors mr-auto">
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Blog
                </Link>
                <div className="absolute left-1/2 -translate-x-1/2">
                    <Link href="/" className="relative w-32 h-8 block">
                        <Image src="/images/clubedasueca-fundoclaro-ext.png" alt="Clube da Sueca" fill className="object-contain dark:hidden" priority />
                        <Image src="/images/clubedasueca-fundoescuro-ext.png" alt="Clube da Sueca" fill className="object-contain hidden dark:block" priority />
                    </Link>
                </div>
            </header>

            <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 md:mt-20">
                {/* Cabeçalho do Artigo */}
                <header className="text-center mb-16">
                    {post.tags && post.tags.length > 0 && (
                        <span className="inline-block mb-6 text-sm font-bold uppercase tracking-widest text-primary">
                            {post.tags[0]}
                        </span>
                    )}

                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif font-extrabold tracking-tight text-gray-900 dark:text-foreground mb-8 leading-tight">
                        {post.title}
                    </h1>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-muted-foreground bg-white dark:bg-card border border-border px-8 py-4 rounded-full w-fit mx-auto shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200">
                                {(post.author as any)?.avatar_url ? (
                                    <img src={(post.author as any).avatar_url} alt="autor" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                                        {String((post.author as any)?.username || 'C').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <span className="font-bold text-gray-900 dark:text-gray-200">{(post.author as any)?.username || 'Equipa CS'}</span>
                        </div>
                        <div className="w-1 h-1 rounded-full bg-border"></div>
                        <time className="flex items-center gap-1.5 font-medium"><Calendar className="w-4 h-4" /> {formatData(post.created_at)}</time>
                        <div className="w-1 h-1 rounded-full bg-border hidden sm:block"></div>
                        <span className="flex items-center gap-1.5 font-medium hidden sm:flex"><Clock className="w-4 h-4" /> {readingTime} min</span>
                    </div>
                </header>

                {/* Imagem de Destaque */}
                {post.cover_image && (
                    <div className="relative w-full aspect-video rounded-3xl overflow-hidden mb-16 shadow-2xl border border-border/50">
                        <img src={post.cover_image} alt={post.title} className="w-full h-full object-cover" />
                    </div>
                )}

                {/* Corpo do Texto */}
                <div className="bg-white dark:bg-card p-8 md:p-16 rounded-[2.5rem] shadow-sm border border-border">
                    <div className="prose prose-lg md:prose-xl prose-stone dark:prose-invert max-w-none prose-headings:font-serif prose-headings:font-bold prose-p:leading-relaxed prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-2xl mx-auto">
                        <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n\n/g, '<br/><br/>') }} />
                    </div>

                    <div className="mt-16 pt-8 border-t border-border flex items-center justify-between text-muted-foreground text-sm font-medium">
                        <span className="flex items-center gap-2"><Eye className="w-4 h-4" /> {post.views || 0} Leituras Totais</span>
                    </div>
                </div>
            </article>
        </div>
    );
}
