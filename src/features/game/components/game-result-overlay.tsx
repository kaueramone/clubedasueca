import { settlementAmounts } from '../settlement'
import { memo } from 'react'
import { Trophy, Home, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GameResultOverlayProps {
    gameResult: { winnerTeam: string; scoreA: number; scoreB: number }
    myTeam: 'A' | 'B'
    stake: number
    isTraining: boolean
    isDemoGuest: boolean
    onExit: () => void
    onNewGame: () => void
    onRegister: () => void
}

export const GameResultOverlay = memo(function GameResultOverlay({
    gameResult,
    myTeam,
    stake,
    isTraining,
    isDemoGuest,
    onExit,
    onNewGame,
    onRegister,
}: GameResultOverlayProps) {
    const amounts = settlementAmounts(stake)
    const draw = gameResult.scoreA === gameResult.scoreB
    const won = !draw && gameResult.winnerTeam === myTeam
    return (
        <div className="absolute inset-0 z-50 flex items-start sm:items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500 overflow-y-auto p-4" role="dialog" aria-label="Resultado do jogo">
            <div className="bg-white p-8 short:p-5 rounded-3xl shadow-2xl text-center max-w-md w-full my-auto max-h-[90dvh] overflow-y-auto border-4 border-accent/20">
                <div className="mb-6 flex justify-center">
                    <div className={cn("p-4 rounded-full", won ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                        <Trophy className="h-12 w-12" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {draw ? 'Empate!' : won ? 'Vitória!' : 'Derrota!'}
                </h2>
                <p className="text-gray-500 mb-6">
                    {draw ? 'As duas equipas terminaram com 60 pontos.' : won ? 'Parabéns, a sua equipa venceu.' : 'Não foi desta vez.'}
                </p>

                {!isTraining && stake > 0 && (
                    <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xl text-center shadow-sm">
                        <p className="text-sm font-bold text-gray-800">{draw ? 'Entrada devolvida por jogador:' : 'Prémio da dupla:'} <span className="text-green-600">{(draw ? stake : amounts.teamPrize).toFixed(2)} créditos de teste</span></p>
                        <p className="text-xs text-gray-500 mt-1">{draw ? 'Sem taxa no empate.' : `Taxa de 20%, ajustada ao cêntimo: ${amounts.fee.toFixed(2)} créditos. Cada vencedor recebe ${amounts.perWinner.toFixed(2)} créditos; ganho líquido ${amounts.gain.toFixed(2)}.`}</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-xl">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Nós ({myTeam})</p>
                        <p className="text-2xl font-bold text-gray-900">{myTeam === 'A' ? gameResult.scoreA : gameResult.scoreB}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Eles ({myTeam === 'A' ? 'B' : 'A'})</p>
                        <p className="text-2xl font-bold text-gray-900">{myTeam === 'A' ? gameResult.scoreB : gameResult.scoreA}</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <div className="flex gap-3">
                        <button
                            onClick={onExit}
                            className="flex-1 flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-3 rounded-xl transition-colors"
                        >
                            <Home className="h-5 w-5" />
                            Sair
                        </button>
                        <button
                            onClick={onNewGame}
                            className="flex-1 flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-xl transition-colors"
                        >
                            <RotateCcw className="h-5 w-5" />
                            Nova Partida
                        </button>
                    </div>

                    {isDemoGuest && (
                        <button
                            onClick={onRegister}
                            className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-accent-foreground font-bold py-3 rounded-xl transition-colors shadow-premium animate-pulse"
                        >
                            <Trophy className="h-5 w-5" />
                            Criar conta e jogar com créditos de teste
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
})
