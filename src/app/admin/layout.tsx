import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (!profile || profile.role !== 'admin') {
        redirect('/dashboard')
    }

    return (
        <div className="flex min-h-screen bg-background text-foreground">
            <AdminSidebar />
            <main className="flex-1 overflow-auto p-8">
                {children}
            </main>
        </div>
    )
}
