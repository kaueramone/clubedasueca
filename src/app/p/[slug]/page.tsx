import { getPageBySlug, getSeoSettings } from '@/features/cms/actions'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

// Next.js dynamic metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
    const page = await getPageBySlug(params.slug)
    if (!page) return {}

    const seo = await getSeoSettings(`/p/${params.slug}`)

    return {
        title: seo?.title || page.title,
        description: seo?.description || `Página de ${page.title}`,
        openGraph: {
            title: seo?.title || page.title,
            description: seo?.description,
            images: seo?.og_image ? [seo.og_image] : [],
        }
    }
}

export default async function StaticPage({ params }: { params: { slug: string } }) {
    const page = await getPageBySlug(params.slug)

    if (!page) {
        notFound()
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 md:py-20">
            <div className="mx-auto max-w-3xl px-4 sm:px-6">
                <article className="prose prose-stone max-w-none rounded-3xl bg-white p-8 sm:p-12 shadow-sm border border-gray-100">
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-8">
                        {page.title}
                    </h1>

                    {/* Em produção, o ideal é usar react-markdown para renderizar isto de forma segura */}
                    <div
                        className="mt-6 text-gray-700 leading-relaxed space-y-4"
                        dangerouslySetInnerHTML={{ __html: page.content.replace(/\n\n/g, '<br/><br/>') }}
                    />
                </article>
            </div>
        </div>
    )
}
