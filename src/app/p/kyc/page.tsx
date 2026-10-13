import DocumentStaticPage from '@/components/layout/document-static-page'
export default function Page() {
    return <DocumentStaticPage title="Identidade e fase de testes" lastUpdated="13 de outubro de 2026">
            <h2>Situação atual</h2>
            <p>O Clube da Sueca está em beta com créditos fictícios. A licença para operar com dinheiro real em Moçambique está pendente. Esta página não declara aprovação regulatória nem certificação de identidade.</p>
            <h2>Registo e idade</h2>
            <p>O registo pede nome, data de nascimento, nacionalidade e email. A plataforma destina-se a maiores de 18 anos. A indicação destes dados não equivale a verificação documental.</p>
            <h2>Documentos e pagamentos</h2>
            <p>No Perfil, pode importar a frente e o verso do seu BI de Moçambique. O leitor extrai nome, número, nascimento e validade. Confirme os dados antes de guardar. Documentos com validade indicada já terminada não são aceites neste envio.</p>
            <p>O BI fica anexado de forma privada à sua ficha, acessível a si e aos administradores para gestão da conta. A leitura e a conferência da data não verificam a autenticidade, não consultam o registo civil e não constituem aprovação de identidade ou autorização para pagamentos.</p>
            <p>Não envie documentos de identidade, dados de carteira móvel ou PIN pelo chat. Não há levantamentos no beta. Os procedimentos de identificação e pagamentos para uma eventual operação licenciada serão publicados antes do lançamento.</p>
    </DocumentStaticPage>
}
