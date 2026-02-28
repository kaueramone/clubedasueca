'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ============================================
// PUBLIC ACTIONS
// ============================================



export async function getBlogPosts(limit = 10) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('blog_posts')
        .select(`
            id, slug, title, excerpt, cover_image, views, created_at, tags,
            author:profiles!author_id(username, avatar_url)
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit)

    if (error) return []
    return data
}

export async function getBlogPostBySlug(slug: string) {
    const supabase = await createClient()
    const { data, error } = await supabase
        .from('blog_posts')
        .select(`
            *,
            author:profiles!author_id(username, avatar_url)
        `)
        .eq('slug', slug)
        .eq('is_published', true)
        .single()

    if (error) return null

    // Increment views async
    if (data) {
        try {
            await supabase.rpc('increment_blog_views', { p_post_id: data.id })
        } catch { }
    }

    return data
}

export async function getSeoSettings(path: string) {
    const supabase = await createClient()
    const { data } = await supabase
        .from('seo_settings')
        .select('*')
        .eq('page_path', path)
        .single()

    return data
}

// ============================================
// ADMIN ACTIONS
// ============================================

// Add similar for blog posts and SEO (simplified for the scope of this migration)
export async function getAllBlogPosts() {
    const supabase = await createClient()
    const { data, error } = await supabase.from('blog_posts').select('*').order('created_at', { ascending: false })
    if (error) return { error: error.message }
    return { posts: data }
}

export async function saveBlogPost(postId: string | null, postData: any) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autenticado' }

    let error
    if (postId) {
        const res = await supabase.from('blog_posts').update({ ...postData, updated_at: new Date().toISOString() }).eq('id', postId)
        error = res.error
    } else {
        const res = await supabase.from('blog_posts').insert({ ...postData, author_id: user.id })
        error = res.error
    }

    if (error) return { error: error.message }

    revalidatePath('/admin/cms')
    revalidatePath('/blog')
    if (postData.slug) revalidatePath(`/blog/${postData.slug}`)

    return { success: true }
}
