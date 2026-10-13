import DocumentStaticPage from '@/components/layout/document-static-page'
export default function Page() {
    return <DocumentStaticPage title="Privacidade no beta" lastUpdated="13 de outubro de 2026">
            <h2>Dados utilizados</h2>
            <p>Recolhemos dados de conta (nome, email, nascimento, nacionalidade, alcunha e avatar), registos de partidas, movimentos de créditos fictícios e mensagens enviadas ao suporte ou aos chats. A alcunha, o avatar e as mensagens públicas são visíveis a outros participantes.</p>
            <h2>Finalidade e prestadores</h2>
            <p>Estes dados permitem autenticar contas, operar as mesas, registar créditos de teste e responder a pedidos. A autenticação e a base de dados usam Supabase. Mensagens dirigidas ao bot comunitário podem ser processadas pelo prestador de inteligência artificial Groq; evite incluir dados pessoais no chat público.</p>
            <h2>Pedidos de privacidade</h2>
            <h3>Bilhete de Identidade no perfil</h3>
            <p>Se optar por importar o BI, guardamos as fotografias da frente e do verso, nome, número do documento, nascimento, validade e o registo da sua autorização. Estes dados ficam privados no Supabase e são acessíveis ao titular e aos administradores para gestão da conta. Não são publicados no perfil público nem nos chats.</p>
            <p>A leitura usa BlinkID no navegador; o SDK contacta a Microblink para licenciamento e serviços técnicos. Ao clicar em Salvar Dados do BI, as fotografias são lidas e, se os campos e a validade forem aceites, enviadas ao armazenamento da plataforma. Não usamos BlinkID Verify neste fluxo e não verificamos a autenticidade.</p>
            <p>Ao substituir o BI, as fotografias anteriores são removidas. Pode pedir a remoção do documento ou a correção dos dados pelo Suporte ou pelo email contacto@clubedasueca.co.mz.</p>
            <p>Pode solicitar acesso, correção ou eliminação dos seus dados através de Suporte no painel. O pedido fica registado e será analisado pela equipa. Não envie PIN nem documentos financeiros. O reset dos saldos no lançamento não significa eliminação automática da conta ou das mensagens.</p>
            <h2>Informação a completar antes do lançamento</h2>
            <p>A identificação formal do responsável, contactos, períodos de conservação e condições aplicáveis à operação licenciada serão publicados pela equipa responsável antes da abertura de pagamentos reais.</p>
    </DocumentStaticPage>
}
