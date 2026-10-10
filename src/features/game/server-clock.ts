export type ServerClock = { remainingMs: number; receivedAt: number }

/** No wall-clock reads: device time zones, skew and clock edits cannot extend a turn. */
export function anchorServerClock(deadline: string, serverNow: string, receivedAt: number, roundTripMs = 0): ServerClock | null {
    const remaining = Date.parse(deadline) - Date.parse(serverNow)
    if (!Number.isFinite(remaining) || !Number.isFinite(receivedAt)) return null
    // A full RTT is conservative: never grant extra time for a slow response.
    return { remainingMs: Math.max(0, Math.min(30000, remaining) - Math.max(0, roundTripMs)), receivedAt }
}

export function serverSecondsLeft(clock: ServerClock, monotonicNow: number): number {
    return Math.max(0, Math.ceil((clock.remainingMs - Math.max(0, monotonicNow - clock.receivedAt)) / 1000))
}
