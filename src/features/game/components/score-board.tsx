import { memo } from 'react'

interface ScoreBoardProps {
    myTeam: 'A' | 'B'
    scoreA: number
    scoreB: number
}

export const ScoreBoard = memo(function ScoreBoard({ scoreA, scoreB, myTeam }: ScoreBoardProps) {
    const ours = myTeam === 'A' ? scoreA : scoreB
    const theirs = myTeam === 'A' ? scoreB : scoreA
    return (
        <div className="absolute top-4 right-4 z-30 flex items-center gap-3">
            <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10 shadow-xl text-white" role="status" aria-label={`Placar: Nós ${ours}, Eles ${theirs}`}>
                <div className="flex items-center gap-4 text-sm sm:text-base">
                    <div className="flex flex-col items-center">
                        <span className="text-white/60 text-xs uppercase font-bold">Nós ({myTeam})</span>
                        <span className="text-xl font-mono font-bold text-[#4ade80]">{ours}</span>
                    </div>
                    <div className="h-8 w-px bg-white/20" />
                    <div className="flex flex-col items-center">
                        <span className="text-white/60 text-xs uppercase font-bold">Eles ({myTeam === 'A' ? 'B' : 'A'})</span>
                        <span className="text-xl font-mono font-bold text-[#f87171]">{theirs}</span>
                    </div>
                </div>
            </div>
        </div>
    )
})
