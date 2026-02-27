'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Camera, Save, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

export default function ProfilePage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>({
        username: '',
        full_name: '',
        birth_date: '',
        avatar_url: null
    })
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)

    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        const getProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                setUser(user)
                const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
                if (data) {
                    setProfile(data)
                    setPreviewUrl(data.avatar_url)
                }
            }
            setLoading(false)
        }
        getProfile()
    }, [])

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        setAvatarFile(file)
        setPreviewUrl(URL.createObjectURL(file))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            let avatarUrl = profile.avatar_url

            // Upload Avatar if changed
            if (avatarFile && user) {
                const fileExt = avatarFile.name.split('.').pop()
                const fileName = `${user.id}-${Math.random()}.${fileExt}`
                const filePath = `${fileName}`

                const { error: uploadError } = await supabase.storage
                    .from('avatars')
                    .upload(filePath, avatarFile)

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('avatars')
                    .getPublicUrl(filePath)

                avatarUrl = publicUrl
            }

            // Update Profile
            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                username: profile.username,
                full_name: profile.full_name,
                birth_date: profile.birth_date, // Ensure format is YYYY-MM-DD or compatible
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            })

            if (error) throw error

            // Force refresh to update Sidebar avatar
            router.refresh()
            alert('Perfil atualizado com sucesso!')
        } catch (error: any) {
            alert('Erro ao atualizar perfil: ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-10">
            <div>
                <h1 className="text-3xl font-bold text-gray-900">Meu Perfil</h1>
                <p className="text-gray-500">Gerencie suas informações pessoais e foto.</p>
            </div>

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-6">

                {/* Avatar Section */}
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative group cursor-pointer">
                        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg relative">
                            {previewUrl ? (
                                <Image src={previewUrl} alt="Avatar" fill className="object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <User className="w-12 h-12" />
                                </div>
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                            <Camera className="w-8 h-8" />
                            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </label>
                    </div>
                    <p className="text-sm text-gray-500">Clique na foto para alterar</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nome de Utilizador</label>
                        <input
                            type="text"
                            required
                            value={profile.username || ''}
                            onChange={e => setProfile({ ...profile, username: e.target.value })}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                        <input
                            type="text"
                            value={profile.full_name || ''}
                            onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Email</label>
                        <input
                            type="email"
                            disabled
                            value={user?.email || ''}
                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-gray-500 cursor-not-allowed"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Data de Nascimento</label>
                        <input
                            type="date"
                            value={profile.birth_date || ''}
                            onChange={e => setProfile({ ...profile, birth_date: e.target.value })}
                            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="w-full flex items-center justify-center bg-accent hover:bg-accent/90 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98]"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                A guardar...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-5 w-5" />
                                Guardar Alterações
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
