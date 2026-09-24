/** Display contract matching migration 108: round equal payouts, retain residual fee. */
export function settlementAmounts(stake: number) {
    const stakeCents = Math.round(stake * 100)
    const potCents = stakeCents * 4
    const winnerCents = Math.round(stakeCents * 8 / 5)
    return { pot: potCents / 100, perWinner: winnerCents / 100, teamPrize: winnerCents * 2 / 100, fee: (potCents - winnerCents * 2) / 100, gain: (winnerCents - stakeCents) / 100 }
}
