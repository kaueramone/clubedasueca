import { GameTable } from '@/features/game/game-table'

export default function DemoPage() {
    return (
        <main className="w-full h-screen overflow-hidden bg-background">
            <GameTable
                isTraining={true}
                isDemoGuest={true}
                currentUser={{ id: 'human', user_metadata: { avatar_url: null } }}
            />
        </main>
    )
}
