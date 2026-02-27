import { getBlogPostBySlug, getSeoSettings } from '@/features/cms/actions'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Metadata } from 'next'

// Next.js dynamic metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const post = await getBlogPostBySlug(params.slug)
    if (!post) return {}

    const seo = await getSeoSettings(`/blog/${params.slug}`)

    return {
        title: seo?.title || `${post.title} | Blog Clube da Sueca`,
        description: seo?.description || post.excerpt || `Artigo sobre ${post.title}`,
        openGraph: {
            title: seo?.title || post.title,
            description: seo?.description || post.excerpt,
            images: seo?.og_image ? [seo.og_image] : (post.cover_image ? [post.cover_image] : []),
        }
    }
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
    const post = await getBlogPostBySlug(params.slug)

    if (!post) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-white">
            <article>
                {/* Header */}
                <header className="mx-auto max-w-4xl px-4 pt-16 sm:px-6 lg:px-8 text-center mb-10">
                    <p className="text-base font-semibold uppercase tracking-wide text-primary">
                        {post.tags && post.tags.length > 0 ? Object.values(post.tags).join(', ') : 'Editorial'}
                    </p>
                    <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
                        {post.title}
                    </h1>

                    <div className="mt-8 flex items-center justify-center">
                        <div className="flex items-center">
                            <div className="flex-shrink-0">
                                <span className="sr-only">{(post.author as any)?.username}</span>
                                <div className="h-12 w-12 rounded-full bg-ios-gray4 flex items-center justify-center font-bold text-white text-lg">
                                    {String((post.author as any)?.username || 'A').charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div className="ml-4 text-left">
                                <p className="text-base font-medium text-gray-900">{(post.author as any)?.username || 'Equipa'}</p>
                                <div className="flex space-x-1 text-sm text-gray-500">
                                    <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                                </div>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Cover Image */}
                {post.cover_image && (
                    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-16">
                        <div className="aspect-[16/9] w-full overflow-hidden rounded-3xl shadow-xl">
                            <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover" />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 pb-24">
                    <div className="prose prose-stone prose-lg max-w-none text-gray-700">
                        {/* Em produção usar react-markdown */}
                        <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n\n/g, '<br/><br/>') }} />
                    </div>

                    <div className="mt-16 border-t border-gray-200 pt-8 flex justify-between items-center">
                        <Link href="/blog" className="text-base font-medium text-primary hover:text-primary-foreground0">
                            ← Voltar ao Blog
                        </Link>
                        <span className="text-sm text-gray-400">{post.views || 0} visualizações</span>
                    </div>
                </div>
            </article>
        </div>
    )
}
