import { listKnowledge } from '@/features/global-chat/knowledge-actions'
import { KnowledgeEditor } from '@/components/admin/knowledge-editor'

export default async function RobotPage() {
    const topics = await listKnowledge()
    return <div className="mx-auto max-w-5xl space-y-6">
        <div><h1 className="text-3xl font-bold">Robô de atendimento</h1>
            <p className="mt-2 text-muted-foreground">Edita os factos que o Sueca Bot usa para responder no chat da comunidade.</p></div>
        <div className="rounded-xl border border-border bg-card p-4 text-sm space-y-2">
            <p>Guarda primeiro um rascunho e depois publica. As alterações publicadas são usadas nas próximas perguntas; mensagens já enviadas permanecem iguais.</p>
            <p>Podes pausar um tópico e reativá-lo. Sem tópicos ativos, o robô não responde. Limites: 40 tópicos, 2000 caracteres por tópico e 24000 caracteres publicados.</p>
            <p>Inclui apenas informações públicas e confirmadas da plataforma. Nunca coloques senhas, chaves ou dados de jogadores. As regras de privacidade, âmbito e créditos fictícios permanecem protegidas.</p>
        </div>
        <KnowledgeEditor initialTopics={topics} />
    </div>
}
