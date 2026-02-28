import DocumentStaticPage from '@/components/layout/document-static-page';

export default function KYCPage() {
    return (
        <DocumentStaticPage title="Política KYC (Conheça o seu Cliente)" lastUpdated="Outubro de 2024">
            <p>
                Em conformidade direta com os regulamentos mundiais de jogo e de combate ao branqueamento
                de capitais (AML), o Clube da Sueca aplica ativamente uma política KYC ("Know Your Customer",
                ou Conheça o seu Cliente). Esta medida atesta que o entretenimento mantido na plataforma
                é não só legal como também seguro para todos os membros que a partilham.
            </p>

            <h2>1. Verificação de Identidade Básica</h2>
            <p>
                Na fase de registo de um membro no nosso clube, os campos basilares como o seu **Nome Completo, Data de Nascimento, Nacionalidade e E-mail válido** servem como primeiro rastreio
                e garantia de idade mínima (18+). Não procedemos a auditorias documentadas logo nesse estádio incipiente, garantindo ao utilizador flexibilidade de depositar pequenos fundos e testar a plataforma.
            </p>

            <h2>2. Níveis de Verificação KYC e Requisitos de Saque</h2>
            <p>
                Por razões operacionais de segurança financeira, qualquer **primeiro levantamento ou cumulativo acionado na carteira** poderá instigar
                aos nossos administradores ou algoritmo de moderação uma requisição pontual dos seus dados comprovativos.
            </p>
            <ul>
                <li><strong>Documento de Identidade:</strong> Cartão do Cidadão, Passaporte ou Carta de Condução emitida por um órgão governamental, clara e detetável.</li>
                <li><strong>Comprovativo de Morada:</strong> Extrato bancário, faturas de concessionárias ou declarações oficiais (emitidos não há mais de 3 meses).</li>
            </ul>

            <h2>3. Inquérito sobre Fonte de Riqueza (SOW)</h2>
            <p>
                Apenas em casos exógenos ou atividade altamente fora do padrão — tais como escalões esmagadores de depósito súbito ou transferências VIP diárias massivas —
                o nosso departamento financeiro ativará protocolos KYC acrescidos de escrutínio para certificar a legitimidade das transações do Utilizador, resguardando tanto o ecossistema como a nossa integridade social.
            </p>

            <h2>4. Prazo Processual e Retenção</h2>
            <p>
                Todos os documentos partilhados para trâmites legais do KYC serão inspecionados num prazo ágil, não retendo as transações habitualmente
                num espaço superior ao de 48h úteis. Documentação é eliminada rotineiramente assim que o processo certificador seja encerrado e devidamente auditado no perfil do jogador.
            </p>
        </DocumentStaticPage>
    );
}
