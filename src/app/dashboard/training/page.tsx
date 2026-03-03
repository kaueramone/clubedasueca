'use client'

import { useRouter } from 'next/navigation'
import { GameTable } from '@/features/game/game-table'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export default function TrainingPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>({ id: 'human', profiles: { username: 'Você', avatar_url: null } })
    const supabase = createClient()

    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser()
            if (authUser) {
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single()
                setUser(profile ? { ...authUser, profiles: profile } : authUser)
            }
        }
        fetchUser()
    }, [supabase])

    return (
        <div className="fixed inset-0 z-50 overflow-hidden bg-ios-gray6">
            <GameTable
                isTraining={true}
                currentUser={user}
            />
        </div>
    )
}
