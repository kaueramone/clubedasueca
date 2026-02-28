import DocumentStaticPage from '@/components/layout/document-static-page';

export default function PrivacidadePage() {
    return (
        <DocumentStaticPage title="Política de Privacidade" lastUpdated="Outubro de 2024">
            <p>
                No Clube da Sueca, acessível a partir da nossa plataforma online, uma das nossas
                principais prioridades é a privacidade dos nossos membros. Este documento de Política
                de Privacidade compila os tipos de informações que são recolhidas e registadas pelo nosso
                clube e a forma como as utilizamos.
            </p>

            <h2>Que Informações Recolhemos</h2>
            <p>
                A recolha de informação pessoal baseia-se unicamente na otimização da experiência:
            </p>
            <ul>
                <li><strong>Dados de Perfil:</strong> Nome, E-mail, Data de Nascimento e Nacionalidade.</li>
                <li><strong>Dados Financeiros:</strong> Histórico de depósitos e saques para cumprimento de exigências Anti-Lavagem de Dinheiro (AML).</li>
                <li><strong>Dados de Jogo:</strong> Registo das partidas jogadas, pontos alcançados, denúncias e interações no lobby.</li>
            </ul>

            <h2>Como Usamos a Informação</h2>
            <p>Utilizamos as informações recolhidas de diversas formas, incluindo para:</p>
            <ul>
                <li>Providenciar, operar e manter a estabilidade das mesas de jogo.</li>
                <li>Melhorar e personalizar a experiência através da oferta de Bónus e Promoções direcionadas.</li>
                <li>Criar mecanismos robustos anti-fraude onde comportamentos anormais de aposta são sinalizados.</li>
                <li>Entrar em contacto periódico (se o membro assim o desejar) para comunicar Eventos ou Manutenções da Plataforma.</li>
            </ul>

            <h2>Segurança de Dados</h2>
            <p>
                Todas as passwords não se encontram alojadas nativamente na nossa base de dados primária,
                sendo suportadas por encriptação <em>Hash</em> delegando a autenticação através do prestador (Supabase Auth).
                Não vendemos informações pessoais, listas de e-mails ou históricos de transação de nenhum dos nossos membros a agentes externos.
            </p>

            <h2>Os seus Direitos (RGPD)</h2>
            <p>
                Se reside sob a jurisdição Europeia, detém direitos abrangidos pelo Regulamento Geral de Proteção de Dados, nomeadamente o direito a solicitar
                acesso aos seus dados corporativos, pedir retificações ou ordenar a eliminação limiar da sua conta, sob alçada de não ter
                financiamentos ativos ou litígios em curso connosco.
            </p>
        </DocumentStaticPage>
    );
}
