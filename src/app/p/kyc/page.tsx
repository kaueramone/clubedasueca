import DocumentStaticPage from '@/components/layout/document-static-page'
export default function Page() {
    return <DocumentStaticPage title="Identidade e fase de testes" lastUpdated="13 de outubro de 2026">
            <h2>Situação atual</h2>
            <p>O Clube da Sueca está em beta com créditos fictícios. A licença para operar com dinheiro real em Moçambique está pendente. Esta página não declara aprovação regulatória nem certificação de identidade.</p>
            <h2>Registo e idade</h2>
            <p>O registo pede nome, data de nascimento, nacionalidade e email. A plataforma destina-se a maiores de 18 anos. A indicação destes dados não equivale a verificação documental.</p>
            <h2>Documentos e pagamentos</h2>
            <p>Para adicionar créditos de teste, é obrigatório enviar no Perfil um BI, passaporte, Cartão de Cidadão ou título de residência com fotografia, nome, número, nascimento e data de validade legíveis. Nos cartões, envie frente e verso; no passaporte, a página de identificação completa. Pode usar a câmara com moldura de alinhamento ou a galeria.</p>
            <p>A plataforma confere se a data de nascimento no documento indica pelo menos 18 anos, se está dentro da validade e se o nome corresponde ao Nome Completo do perfil. A comparação tolera acentos, ordem dos nomes e partículas portuguesas, mas exige os restantes nomes completos. Estas condições voltam a ser conferidas em cada adição de créditos. Documentos antigos sem conferência de fotografia precisam de novo envio.</p>
            <p>As imagens são processadas pelo Google Gemini e guardadas de forma privada na sua ficha, acessíveis a si e aos administradores. A extração e estas conferências não comprovam a autenticidade nem confirmam que quem enviou é o titular; não consultam o registo civil nem constituem autorização para pagamentos reais.</p>
            <p>Não envie documentos de identidade, dados de carteira móvel ou PIN pelo chat. Não há levantamentos no beta. Os procedimentos de identificação e pagamentos para uma eventual operação licenciada serão publicados antes do lançamento.</p>
    </DocumentStaticPage>
}
