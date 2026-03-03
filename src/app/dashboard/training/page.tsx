'use client'

import { useRouter } from 'next/navigation'
import { GameTable } from '@/features/game/game-table'
import { ArrowLeft } from 'lucide-react'

export default function TrainingPage() {
    const router = useRouter()

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ios-gray6">
            <GameTable
                isTraining={true}
                // Pass dummy props to satisfy Typescript if needed, though we made them optional
                currentUser={{ id: 'human', user_metadata: { full_name: 'Você' } }}
            />
        </div>
    )
}
