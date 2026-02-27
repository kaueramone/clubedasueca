'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Camera, Save, Loader2, LogOut, Globe } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function ProfilePage() {
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [user, setUser] = useState<any>(null)
    const [profile, setProfile] = useState<any>({
        username: '',
        full_name: '',
        birth_date: '',
        nationality: 'PT',
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
                    setProfile({
                        username: data.username || '',
                        full_name: data.full_name || '',
                        birth_date: data.birth_date || '',
                        nationality: data.nationality || 'PT',
                        avatar_url: data.avatar_url
                    })
                    setPreviewUrl(data.avatar_url)
                }
            }
            setLoading(false)
        }
        getProfile()
    }, [supabase])

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return
        const file = e.target.files[0]
        setAvatarFile(file)
        setPreviewUrl(URL.createObjectURL(file))
    }

    const handleLogout = async () => {
        if (confirm('Tem certeza que deseja sair da sua conta?')) {
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            let avatarUrl = profile.avatar_url

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

            const { error } = await supabase.from('profiles').upsert({
                id: user.id,
                username: profile.username,
                full_name: profile.full_name,
                birth_date: profile.birth_date || null,
                nationality: profile.nationality,
                avatar_url: avatarUrl,
                updated_at: new Date().toISOString(),
            })

            if (error) throw error

            router.refresh()
            alert('Perfil atualizado com sucesso!')
        } catch (error: any) {
            alert('Erro ao atualizar perfil (Certifique-se que correu a migration SQL 070_profile_updates): ' + error.message)
        } finally {
            setSaving(false)
        }
    }

    if (loading) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin text-accent" /></div>

    return (
        <div className="max-w-2xl mx-auto space-y-8 pb-10 animate-in fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-serif font-bold text-foreground">A Minha Conta</h1>
                    <p className="text-muted-foreground mt-1">Gira as suas informações pessoais e foto de perfil.</p>
                </div>
                <Button variant="danger" onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Terminar Sessão
                </Button>
            </div>

            <Card className="p-8">
                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Avatar Section */}
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className="relative group cursor-pointer">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-muted border-4 border-border shadow-lg relative">
                                {previewUrl ? (
                                    <Image src={previewUrl} alt="Avatar" fill className="object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                        <User className="w-12 h-12" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                                <Camera className="w-8 h-8" />
                                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                            </label>
                        </div>
                        <p className="text-sm text-muted-foreground">Clique na foto para alterar</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Nome de Utilizador</label>
                            <Input
                                type="text"
                                required
                                value={profile.username || ''}
                                onChange={e => setProfile({ ...profile, username: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Nome Completo</label>
                            <Input
                                type="text"
                                value={profile.full_name || ''}
                                onChange={e => setProfile({ ...profile, full_name: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Email</label>
                            <Input
                                type="email"
                                disabled
                                value={user?.email || ''}
                                className="bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-foreground">Data de Nascimento</label>
                            <Input
                                type="date"
                                value={profile.birth_date || ''}
                                onChange={e => setProfile({ ...profile, birth_date: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                Nacionalidade
                            </label>
                            <select
                                value={profile.nationality}
                                onChange={e => setProfile({ ...profile, nationality: e.target.value })}
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <option value="PT">Portugal 🇵🇹</option>
                                <option value="BR">Brasil 🇧🇷</option>
                                <option value="AO">Angola 🇦🇴</option>
                                <option value="MZ">Moçambique 🇲🇿</option>
                                <option value="CV">Cabo Verde 🇨🇻</option>
                                <option value="ST">São Tomé e Príncipe 🇸🇹</option>
                                <option value="GW">Guiné-Bissau 🇬🇼</option>
                                <option value="CH">Suíça 🇨🇭</option>
                                <option value="FR">França 🇫🇷</option>
                                <option value="UK">Reino Unido 🇬🇧</option>
                                <option value="LU">Luxemburgo 🇱🇺</option>
                                <option value="OTHER">Outra</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-border">
                        <Button
                            type="submit"
                            disabled={saving}
                            variant="primary"
                            size="lg"
                            className="w-full sm:w-auto"
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
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    )
}
