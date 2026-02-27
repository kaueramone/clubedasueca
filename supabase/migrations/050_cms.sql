-- ============================================
-- Migration 050: CMS Interno (Páginas, Blog e SEO)
-- Gestão de conteúdo estático e dinâmico com SEO
-- ============================================

-- ============================================
-- PAGES (Termos, Sobre Nós, Privacidade)
-- ============================================
CREATE TABLE public.pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- ex: 'termos-e-condicoes'
  title TEXT NOT NULL,
  content TEXT NOT NULL,               -- Conteúdo em Markdown
  is_published BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BLOG POSTS
-- ============================================
CREATE TABLE public.blog_posts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,           -- ex: 'dicas-de-sueca-avancadas'
  title TEXT NOT NULL,
  excerpt TEXT,                        -- Resumo para a listagem
  content TEXT NOT NULL,               -- Conteúdo em Markdown
  cover_image TEXT,                    -- URL da imagem principal
  is_published BOOLEAN DEFAULT FALSE,
  author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SEO SETTINGS (Global ou Específico)
-- ============================================
CREATE TABLE public.seo_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_path TEXT UNIQUE NOT NULL,      -- route path ex: '/', '/play', '/blog/dicas'
  title TEXT,
  description TEXT,
  og_image TEXT,
  keywords TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_pages_slug ON public.pages(slug);
CREATE INDEX idx_blog_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_published ON public.blog_posts(is_published, created_at DESC);
CREATE INDEX idx_seo_path ON public.seo_settings(page_path);

-- RLS
ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

-- Pages: Public can read published, Admin can do all
CREATE POLICY "Public can view published pages" ON public.pages
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage pages" ON public.pages
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Blog: Public can read published, Admin can do all
CREATE POLICY "Public can view published posts" ON public.blog_posts
  FOR SELECT USING (is_published = true);
CREATE POLICY "Admins can manage posts" ON public.blog_posts
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- SEO: Public can read all, Admin can do all
CREATE POLICY "Public can view SEO" ON public.seo_settings
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage SEO" ON public.seo_settings
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Function to increment blog views
CREATE OR REPLACE FUNCTION public.increment_blog_views(p_post_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.blog_posts SET views = views + 1 WHERE id = p_post_id;
END;
$$;
