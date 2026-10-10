import Image from 'next/image'
import { getCardAssetPath } from '../utils'
import styles from '../game-table.module.css'

// All deck sprites are 64×64; the card occupies x=11..53, y=2..62.
// Frame that area without stretching the artwork or changing the source assets.
export function CardArt({ card, back = false, label = '' }: { card?: string; back?: boolean; label?: string }) {
    return (
        <span className={styles.cardArt}>
            <Image src={back ? '/cards/card_back.png' : getCardAssetPath(card!)} alt={label}
                width={64} height={64} unoptimized draggable={false} className={styles.cardSprite} />
        </span>
    )
}
