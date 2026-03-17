import { Card, Rank, Suit } from './types';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', 'Q', 'J', 'K', '7', 'A'];
const VALUES: Record<Rank, number> = {
    '2': 0, '3': 0, '4': 0, '5': 0, '6': 0,
    'Q': 2, 'J': 3, 'K': 4, '7': 10, 'A': 11
};

export function generateDeck(): string[] {
    const deck: string[] = [];
    for (const suit of SUITS) {
        for (const rank of RANKS) {
            deck.push(`${suit}-${rank}`);
        }
    }
    return deck;
}

export function shuffleDeck(deck: string[]): string[] {
    const newDeck = [...deck];
    for (let i = newDeck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
    }
    return newDeck;
}

export function getCardValue(cardId: string): number {
    if (!cardId) return 0;
    const parts = cardId.split('-');
    if (parts.length < 2) return 0;
    const rank = parts[1] as Rank;
    return VALUES[rank] || 0;
}

export function getCardSuit(cardId: string): Suit {
    if (!cardId) return 'spades'; // Default fallback safely
    return cardId.split('-')[0] as Suit;
}

export function getTrickWinner(cards: { player_id: string; card: string }[], trumpSuit: Suit): string {
    if (cards.length === 0) return '';

    const leadSuit = getCardSuit(cards[0].card);
    let winner = cards[0];

    for (let i = 1; i < cards.length; i++) {
        const current = cards[i];
        const best = winner;

        const currentSuit = getCardSuit(current.card);
        const bestSuit = getCardSuit(best.card);
        const currentValue = getCardValue(current.card);
        const bestValue = getCardValue(best.card);

        // Logic:
        // 1. If best is trump, current must be higher trump to win.
        // 2. If best is not trump, current wins if it is trump OR (current is lead suit and higher value).

        // Actually simpler:
        // If current is trump and best is not, current wins.
        // If current and best are both trump, higher value wins.
        // If neither is trump, but current matches lead suit, check value vs best.
        // (If best was trump, it stays winner unless overridden by higher trump).
        // (If best was lead suit, current only wins if lead suit and higher).

        const isCurrentTrump = currentSuit === trumpSuit;
        const isBestTrump = bestSuit === trumpSuit;

        if (isCurrentTrump && !isBestTrump) {
            winner = current;
        } else if (isCurrentTrump && isBestTrump) {
            if (currentValue > bestValue) winner = current;
            // If values equal (impossible in single deck), or rank logic (7 vs 6 if both 0 pts? No, rank order matters for 0 pt cards too)
            // Wait, 0 point cards still have hierarchy: 6 > 5 > 4 > 3 > 2.
            // My value map gives them all 0. I should assign "strength" or just compare ranks index.
            else if (currentValue === bestValue) {
                // Compare rank index
                const currentRankIndex = RANKS.indexOf(current.card.split('-')[1] as Rank);
                const bestRankIndex = RANKS.indexOf(best.card.split('-')[1] as Rank);
                if (currentRankIndex > bestRankIndex) winner = current;
            }
        } else if (!isCurrentTrump && !isBestTrump) {
            if (currentSuit === leadSuit) {
                if (bestSuit !== leadSuit) {
                    // Should not happen if best is current winner logic updates correctly
                    // If best was not trump and not lead suit (impossible for first card), but suppose previous loop set it?
                    // The first card sets the lead suit. "winner" always tracks the best so far.
                    // If "winner" is lead suit, current must be lead suit and higher.
                }

                if (currentSuit === getCardSuit(winner.card)) { // Both lead suit
                    const currentRankIndex = RANKS.indexOf(current.card.split('-')[1] as Rank);
                    const bestRankIndex = RANKS.indexOf(best.card.split('-')[1] as Rank);
                    if (currentRankIndex > bestRankIndex) winner = current;
                }
            }
        }
    }

    return winner.player_id;
}

export function isValidMove(card: string, hand: string[], leadSuit: Suit | null): boolean {
    if (!leadSuit) return true; // First card of trick is always valid

    // If player has cards of lead suit, must play one
    const handSuits = hand.map(c => getCardSuit(c));
    if (handSuits.includes(leadSuit)) {
        return getCardSuit(card) === leadSuit;
    }

    // If doesn't have lead suit, can play any card
    return true;
}

export function sortHand(hand: string[]): string[] {
    const SUIT_ORDER: Record<Suit, number> = { 'hearts': 0, 'diamonds': 1, 'clubs': 2, 'spades': 3 };
    const RANK_ORDER: Record<Rank, number> = { '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, 'Q': 5, 'J': 6, 'K': 7, '7': 8, 'A': 9 };

    return [...hand].sort((a, b) => {
        const suitA = SUIT_ORDER[getCardSuit(a)];
        const suitB = SUIT_ORDER[getCardSuit(b)];
        if (suitA !== suitB) return suitA - suitB;

        const rankA = RANK_ORDER[a.split('-')[1] as Rank] ?? 0;
        const rankB = RANK_ORDER[b.split('-')[1] as Rank] ?? 0;
        return rankA - rankB;
    });
}

export function getCardAssetPath(cardId: string): string {
    if (!cardId) return '/cards/card_back.png';
    const [suit, rank] = cardId.split('-');

    let rankSuffix = rank;
    if (['2', '3', '4', '5', '6', '7'].includes(rank)) {
        rankSuffix = `0${rank}`;
    }

    return `/cards/card_${suit}_${rankSuffix}.png`;
}

