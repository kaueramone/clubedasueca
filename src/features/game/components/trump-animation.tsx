import { memo } from 'react'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import { getCardAssetPath } from '../utils'

interface TrumpAnimationProps {
    trumpCard: string
    isFadingOut: boolean
}

export const TrumpAnimation = memo(function TrumpAnimation({ trumpCard, isFadingOut }: TrumpAnimationProps) {
    return (
        <div
            className={cn(
                "absolute inset-0 z-[60] flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm pointer-events-none transition-opacity duration-700 ease-in-out",
                isFadingOut ? "opacity-0" : "opacity-100"
            )}
            role="alert"
            aria-label={`Trunfo: ${trumpCard}`}
        >
            <div className={cn(
                "text-center flex flex-col items-center transition-all duration-700 ease-in-out",
                isFadingOut
                    ? "transform translate-y-32 scale-75 opacity-0"
                    : "animate-in zoom-in duration-500 fill-mode-backwards"
            )}>
                <h2 className="text-3xl sm:text-5xl font-black text-white uppercase tracking-widest drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] mb-8">
                    O Trunfo
                </h2>
                <div className="transform scale-[1.1] sm:scale-[1.4] shadow-[0_0_40px_rgba(255,215,0,0.6)] rounded-xl relative">
                    <div className="absolute inset-0 bg-[#FFD700] rounded-xl blur-md opacity-40 animate-pulse" />
                    <div className="relative w-[5.2rem] h-[7.8rem] sm:w-[6.5rem] sm:h-[9.75rem] lg:w-32 lg:h-48 filter drop-shadow-md">
                        <Image
                            src={getCardAssetPath(trumpCard)}
                            alt={`Trunfo: ${trumpCard}`}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 100px, 150px"
                            priority
                        />
                    </div>
                </div>
            </div>
        </div>
    )
})
