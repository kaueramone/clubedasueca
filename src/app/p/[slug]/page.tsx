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
    let page = await getPageBySlug(params.slug)

    if (!page) {
        // Fallback for static footer pages if DB is empty
        const defaultPages: Record<string, any> = {
            'como-funciona': { title: 'Como Funciona?', content: '## O Clube da Sueca\n\nBem-vindo ao único clube online focado na tradição da sueca portuguesa.\n\n### Regras Clássicas\nA nossa sueca segue a rigor as regras de renúncia com punições automáticas...' },
            'deposito-saque': { title: 'Depósitos e Saques', content: '## Pagamentos Instantâneos\n\nTrabalhamos exclusivamente com referências geradas em tempo real.\n\n### MB Way e PIX\nPagamentos disponíveis 24/7. As retiradas levam até 1h útil.' },
            'termos': { title: 'Termos de Utilização', content: '## Termos e Condições\n\nAo jogar no Clube da Sueca concorda com a retenção da taxa de 20% (Rake) nas mesas a dinheiro real.' },
            'privacidade': { title: 'Política de Privacidade', content: '## Dados Seguros\n\nO seu e-mail e dados de transação estão encriptados e nunca são partilhados com terceiros.' },
            'kyc': { title: 'Políticas KYC', content: '## Conheça o Cliente\n\nReservamo-nos o direito de pedir identificação para levantamentos acima de €1.000,00.' }
        }

        if (defaultPages[params.slug]) {
            page = defaultPages[params.slug]
        } else {
            notFound()
        }
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
