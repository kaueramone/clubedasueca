import { memo } from 'react'
import Image from 'next/image'
import { PlusCircle } from 'lucide-react'

interface PlayerAvatarProps {
    player: any
    gameStatus: string
    borderColorClass: string
}

export const PlayerAvatar = memo(function PlayerAvatar({ player, gameStatus, borderColorClass }: PlayerAvatarProps) {
    return (
        <div className={`h-12 w-12 rounded-full border-2 ${borderColorClass} bg-black/20 overflow-hidden shadow-lg relative`}>
            {player?.profiles?.avatar_url ? (
                <Image src={player.profiles.avatar_url} alt={player.profiles.username || 'Jogador'} fill className="object-cover" />
            ) : player?.profiles?.username ? (
                <div className="w-full h-full bg-primary flex items-center justify-center font-bold text-white text-lg">
                    {player.profiles.username.charAt(0).toUpperCase()}
                </div>
            ) : gameStatus === 'waiting' ? (
                <button
                    onClick={() => alert('Em breve: Partilhar Link!')}
                    className="w-full h-full bg-accent flex items-center justify-center text-white hover:bg-accent/80 transition-colors"
                    aria-label="Convidar jogador"
                >
                    <PlusCircle className="w-5 h-5" />
                </button>
            ) : (
                <div className="w-full h-full bg-gray-400 flex items-center justify-center text-xs text-white">Bot</div>
            )}
        </div>
    )
})
