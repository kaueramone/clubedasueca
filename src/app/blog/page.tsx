import { getBlogPosts, getSeoSettings } from '@/features/cms/actions'
import Link from 'next/link'
import { Metadata } from 'next'

export async function generateMetadata(): Promise<Metadata> {
    const seo = await getSeoSettings('/blog')
    return {
        title: seo?.title || 'Blog Oficial | Clube da Sueca',
        description: seo?.description || 'Dicas, novidades e torneios da melhor plataforma de Sueca online.',
        openGraph: {
            title: seo?.title || 'Blog Oficial | Clube da Sueca',
            description: seo?.description,
            images: seo?.og_image ? [seo.og_image] : [],
        }
    }
}

export default async function BlogListingPage() {
    const posts = await getBlogPosts(20)

    return (
        <div className="min-h-screen bg-gray-50 py-12 md:py-20">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">Blog Clube da Sueca</h1>
                    <p className="mt-4 text-xl text-gray-500">Estratégias avançadas, novidades e comunidade.</p>
                </div>

                {posts.length === 0 ? (
                    <div className="text-center py-20 text-gray-500 bg-white rounded-3xl shadow-sm border border-gray-100">
                        Nenhum artigo publicado ainda. Volte em breve!
                    </div>
                ) : (
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        {posts.map(post => (
                            <Link key={post.id} href={`/blog/${post.slug}`} className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-[1.01]">
                                <div className="h-48 w-full bg-gray-200 overflow-hidden relative">
                                    {post.cover_image ? (
                                        <img src={post.cover_image} alt={post.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                                    ) : (
                                        <div className="flex h-full items-center justify-center bg-primary/10 text-primary-foreground/70">
                                            <span className="text-4xl font-bold">♠️♥️</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-1 flex-col justify-between p-6">
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-primary">
                                            {post.tags && post.tags.length > 0 ? (post.tags[0] as string) : 'Artigo'}
                                        </p>
                                        <h3 className="mt-2 text-xl font-bold text-gray-900 line-clamp-2">{post.title}</h3>
                                        <p className="mt-3 text-base text-gray-500 line-clamp-3">{post.excerpt}</p>
                                    </div>
                                    <div className="mt-6 flex items-center">
                                        <div className="flex-shrink-0">
                                            <span className="sr-only">{(post.author as any)?.username}</span>
                                            {/* Avatar placeholder */}
                                            <div className="h-10 w-10 rounded-full bg-ios-gray4 flex items-center justify-center font-bold text-white">
                                                {String((post.author as any)?.username || 'A').charAt(0).toUpperCase()}
                                            </div>
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <p className="font-medium text-gray-900">{(post.author as any)?.username || 'Equipa'}</p>
                                            <div className="flex space-x-1 text-gray-500">
                                                <time dateTime={post.created_at}>{new Date(post.created_at).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                                                <span aria-hidden="true">&middot;</span>
                                                <span>{post.views || 0} leituras</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
