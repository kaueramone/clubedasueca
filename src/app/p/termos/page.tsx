import DocumentStaticPage from '@/components/layout/document-static-page';

export default function TermosPage() {
    return (
        <DocumentStaticPage title="Termos e Condições" lastUpdated="Outubro de 2024">
            <p>
                Bem-vindo ao Clube da Sueca. Estes termos e condições delineiam as regras e regulamentos
                para a utilização do website e serviços da nossa plataforma.
                Ao aceder a este site, pressupomos que aceita estes termos na sua totalidade.
            </p>

            <h2>1. Utilização da Plataforma</h2>
            <p>
                O Clube da Sueca fornece um ambiente digital para jogar a tradicional sueca portuguesa.
                É estritamente proibido o uso de software de terceiros (bots, analisadores de cartas, etc.)
                para ganhar vantagens injustas. Qualquer comportamento fraudulento resultará no banimento imediato e retenção de fundos.
            </p>

            <h2>2. Idade Mínima</h2>
            <p>
                É necessário ter pelo menos 18 anos de idade para se registar e jogar ou depositar fundos no Clube da Sueca.
                Ao criar uma conta, confirma que tem a idade legal estipulada pela sua jurisdição local.
            </p>

            <h2>3. Financiamento e Prémios</h2>
            <ul>
                <li>O Clube opera em Euros (€). As conversões, quando aplicáveis, são da responsabilidade da entidade bancária.</li>
                <li>As mesas a dinheiro real têm um valor estipulado à entrada (Buy-in / Stake). O valor é deduzido do saldo assim que o jogo inicia.</li>
                <li>A equipa vencedora (que alcance 61 ou mais pontos na partida) recebe o Pote Acumulado subtraído de uma <strong>Taxa Administrativa (Rake) de 20%</strong>.</li>
            </ul>

            <h2>4. Regras do Jogo e Fair Play</h2>
            <p>
                A quebra grave de regras (como a renúncia propositada ou o insubordinação extrema no chat com outros jogadores)
                é regida pelas normas da nossa moderação. Jogos abandonados ou timeouts de desconexão podem resultar em derrota automática
                da equipa respetiva, de forma a não adulterar a experiência dos restantes três participantes.
            </p>

            <h2>5. Limitação de Responsabilidade</h2>
            <p>
                O Clube da Sueca atua unicamente como anfitrião e promotor tecnológico das partidas de sueca.
                Não nos responsabilizamos por falhas de conexão originárias do prestador de internet do utilizador.
            </p>
        </DocumentStaticPage>
    );
}
