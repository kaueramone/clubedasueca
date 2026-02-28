import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getContacts } from './actions'
import ChatUI from './chat-ui'

export default async function ChatPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { friends, pendingRequests } = await getContacts()

    // Add "Support" as a systemic friend
    const supportContact = {
        friendship_id: 'support',
        id: 'support-official-contact',
        username: 'Suporte Oficial',
        avatar_url: '/images/clubedasueca-icone.png',
        isSupport: true
    }

    const allContacts = [supportContact, ...friends]

    return (
        <div className="h-[calc(100vh-140px)] sm:h-[calc(100vh-100px)] lg:h-[calc(100vh-40px)] w-full overflow-hidden flex flex-col pt-0">
            <ChatUI
                currentUser={{ id: user.id, email: user.email }}
                contacts={allContacts}
                pendingRequests={pendingRequests}
            />
        </div>
    )
}
