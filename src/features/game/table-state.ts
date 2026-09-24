import { getCardSuit, getCardValue, getTrickWinner, isValidMove } from './utils'

export type TablePlayer = { user_id: string; position: number; team: 'A' | 'B'; hand: string[]; hand_count?: number; card_count?: number; profiles: { username: string; avatar_url?: string | null } }
export type TableState = { id: string; status: string; stake: number; host_id?: string; game_players: TablePlayer[]; current_turn: number; current_trick_cards: { player_id: string; card: string }[]; trump_card: string | null; trump_suit?: string; rounds: { winner: string; points: number; cards: { player_id: string; card: string }[] }[]; score_a?: number; score_b?: number; winner_team?: string | null; turn_deadline?: string | null }

/** Apply one authoritative response; never combine hands from one revision with another turn. */
export function tableFromSnapshot(snapshot: { game: Omit<TableState, 'game_players'>; players: TablePlayer[] }): TableState {
    if (!snapshot?.game || !Array.isArray(snapshot.players)) throw new Error('Estado da mesa indisponível')
    return { ...snapshot.game, rounds: snapshot.game.rounds ?? [], current_trick_cards: snapshot.game.current_trick_cards ?? [], trump_card: snapshot.game.trump_card ?? (snapshot.game.trump_suit ? `${snapshot.game.trump_suit}-A` : null), game_players: snapshot.players.map(p => ({ ...p, hand: p.hand ?? [], hand_count: p.card_count ?? p.hand_count ?? p.hand?.length ?? 0 })) }
}

export function trainingMove(state: TableState, playerId: string, card: string): TableState {
    const player = state.game_players.find(p => p.user_id === playerId)
    const lead = state.current_trick_cards[0]?.card
    if (state.status !== 'playing' || !player || player.position !== state.current_turn || state.current_trick_cards.length >= 4 || !player.hand.includes(card) || !isValidMove(card, player.hand, lead ? getCardSuit(lead) : null)) return state
    return { ...state, game_players: state.game_players.map(p => p === player ? { ...p, hand: p.hand.filter(c => c !== card) } : p), current_trick_cards: [...state.current_trick_cards, { player_id: playerId, card }], current_turn: (state.current_turn + 1) % 4 }
}

export function settleTrainingTrick(state: TableState): TableState {
    if (state.current_trick_cards.length !== 4) return state
    const winner = getTrickWinner(state.current_trick_cards, getCardSuit(state.trump_card!))
    const player = state.game_players.find(p => p.user_id === winner)!
    const points = state.current_trick_cards.reduce((sum, c) => sum + getCardValue(c.card), 0)
    const rounds = [...state.rounds, { winner, points, cards: state.current_trick_cards }]
    const score_a = (state.score_a ?? 0) + (player.team === 'A' ? points : 0)
    const score_b = (state.score_b ?? 0) + (player.team === 'B' ? points : 0)
    return { ...state, rounds, score_a, score_b, current_trick_cards: [], current_turn: player.position, status: rounds.length === 10 ? 'finished' : 'playing', winner_team: rounds.length === 10 ? (score_a === score_b ? 'Draw' : score_a > score_b ? 'A' : 'B') : null }
}

export function secondsToDeadline(deadline: string, now = Date.now()): number {
    return Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000))
}

export function cardLabel(card: string): string {
    const [suit, rank] = card.split('-')
    return `${({ A: 'Ás', K: 'Rei', J: 'Valete', Q: 'Dama' } as Record<string, string>)[rank] ?? rank} de ${({ hearts: 'copas', diamonds: 'ouros', clubs: 'paus', spades: 'espadas' } as Record<string, string>)[suit] ?? suit}`
}
