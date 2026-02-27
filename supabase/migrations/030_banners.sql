-- ============================================
-- Migration 030: Sistema de Banners
-- Banners dinâmicos com segmentação e estatísticas
-- ============================================

CREATE TYPE banner_position AS ENUM ('hero', 'sidebar', 'footer', 'popup', 'dashboard_top', 'game_lobby');

CREATE TABLE public.banners (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,                      -- URL da imagem (Supabase Storage)
  link_url TEXT,                       -- URL de destino ao clicar
  position banner_position DEFAULT 'dashboard_top',
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER DEFAULT 0,         -- Maior = mais visível
  
  -- Agendamento
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,               -- NULL = sem fim
  
  -- Segmentação
  target_segment TEXT DEFAULT 'all',   -- 'all', 'new', 'vip_bronze', etc.
  
  -- Localização
  locale TEXT DEFAULT 'pt',
  
  -- Estatísticas
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.banner_clicks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  banner_id UUID REFERENCES public.banners(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  clicked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_banners_active ON public.banners(is_active, position);
CREATE INDEX idx_banners_dates ON public.banners(start_date, end_date);
CREATE INDEX idx_banner_clicks_banner ON public.banner_clicks(banner_id);

-- RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.banner_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.banners
  FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage banners" ON public.banners
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

CREATE POLICY "System can insert banner clicks" ON public.banner_clicks
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view banner clicks" ON public.banner_clicks
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
