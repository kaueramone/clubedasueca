import { memo } from 'react'
import { Trophy, Home, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GameResultOverlayProps {
    gameResult: { winnerTeam: string; scoreA: number; scoreB: number }
    stake: number
    isTraining: boolean
    isDemoGuest: boolean
    onExit: () => void
    onNewGame: () => void
    onRegister: () => void
}

export const GameResultOverlay = memo(function GameResultOverlay({
    gameResult,
    stake,
    isTraining,
    isDemoGuest,
    onExit,
    onNewGame,
    onRegister,
}: GameResultOverlayProps) {
    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500" role="dialog" aria-label="Resultado do jogo">
            <div className="bg-white p-8 rounded-3xl shadow-2xl text-center max-w-md w-full mx-4 border-4 border-accent/20">
                <div className="mb-6 flex justify-center">
                    <div className={cn("p-4 rounded-full", gameResult.winnerTeam === 'A' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600")}>
                        <Trophy className="h-12 w-12" />
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                    {gameResult.winnerTeam === 'A' ? 'Vitória!' : 'Derrota!'}
                </h2>
                <p className="text-gray-500 mb-6">
                    {gameResult.winnerTeam === 'A' ? 'Parabéns, a sua equipa venceu.' : 'Não foi desta vez.'}
                </p>

                {!isTraining && stake > 0 && (
                    <div className="mb-6 p-3 bg-gray-50 border border-gray-200 rounded-xl text-center shadow-sm">
                        <p className="text-sm font-bold text-gray-800">Pote da Equipa Vencedora: <span className="text-green-600">€{(stake * 4 * 0.8).toFixed(2)}</span></p>
                        <p className="text-xs text-gray-500 mt-1">Taxa de Mesa (Rake do Clube): 20%</p>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 mb-8 bg-gray-50 p-4 rounded-xl">
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Nós (Team A)</p>
                        <p className="text-2xl font-bold text-gray-900">{gameResult.scoreA}</p>
                    </div>
                    <div>
                        <p className="text-xs font-bold text-gray-400 uppercase">Eles (Team B)</p>
                        <p className="text-2xl font-bold text-gray-900">{gameResult.scoreB}</p>
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
                            Gostou? Crie a sua Conta e Jogue a Dinheiro!
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
})
