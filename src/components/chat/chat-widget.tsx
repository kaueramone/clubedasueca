import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
export default function ChatWidget({ userId }: { userId?: string }) {
    if (!userId) return null
    return <Link href="/dashboard/support" aria-label="Abrir suporte" className="fixed bottom-24 right-4 z-40 rounded-full bg-primary p-4 text-white shadow-lg"><MessageCircle className="h-6 w-6" /></Link>
}
