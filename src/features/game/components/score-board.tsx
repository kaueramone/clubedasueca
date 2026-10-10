import { memo } from 'react'
import styles from '../game-table.module.css'

interface ScoreBoardProps {
    myTeam: 'A' | 'B'
    scoreA: number
    scoreB: number
}

export const ScoreBoard = memo(function ScoreBoard({ scoreA, scoreB, myTeam }: ScoreBoardProps) {
    const ours = myTeam === 'A' ? scoreA : scoreB
    const theirs = myTeam === 'A' ? scoreB : scoreA
    return (
        <div className={styles.score} role="status" aria-label={`Placar: Nós ${ours}, Eles ${theirs}`}>
            <div className={styles.scoreTeam}><span>Nós ({myTeam})</span><strong>{ours}</strong></div>
            <div className={styles.scoreDivider} aria-hidden="true" />
            <div className={styles.scoreTeam}><span>Eles ({myTeam === 'A' ? 'B' : 'A'})</span><strong>{theirs}</strong></div>
        </div>
    )
})
