-- ============================================
-- Migration 040: CRM Avançado
-- Tracking de utilizadores, métricas e automações
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE automation_trigger AS ENUM (
  'on_register',
  'on_first_deposit',
  'on_inactivity_3d',
  'on_inactivity_7d',
  'on_inactivity_30d',
  'on_level_up',
  'on_birthday',
  'manual'
);

CREATE TYPE email_status AS ENUM ('queued', 'sent', 'failed', 'opened');

-- ============================================
-- USER_METRICS
-- ============================================
CREATE TABLE public.user_metrics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Financial
  total_deposited DECIMAL(12,2) DEFAULT 0,
  total_withdrawn DECIMAL(12,2) DEFAULT 0,
  total_wagered DECIMAL(12,2) DEFAULT 0,
  total_won DECIMAL(12,2) DEFAULT 0,
  
  -- Engagement
  games_played INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  
  -- Timestamps
  last_deposit_at TIMESTAMPTZ,
  last_game_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  
  -- Calculated
  risk_score INTEGER DEFAULT 0,       -- 0-100 (Alto = risco de churn ou abuso)
  ltv DECIMAL(12,2) DEFAULT 0,        -- Lifetime Value estimado
  segment TEXT DEFAULT 'new',         -- 'new', 'active', 'vip', 'churning', 'dormant'
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL_AUTOMATION_RULES
-- ============================================
CREATE TABLE public.email_automation_rules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger automation_trigger NOT NULL,
  subject TEXT NOT NULL,
  body_template TEXT NOT NULL,         -- Markdown com {{placeholders}}
  segment TEXT DEFAULT 'all',          -- 'all' ou nome do fragmento target
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EMAIL_LOGS
-- ============================================
CREATE TABLE public.email_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  rule_id UUID REFERENCES public.email_automation_rules(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  status email_status DEFAULT 'queued',
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_user_metrics_user ON public.user_metrics(user_id);
CREATE INDEX idx_user_metrics_segment ON public.user_metrics(segment);
CREATE INDEX idx_user_metrics_ltv ON public.user_metrics(ltv DESC);
CREATE INDEX idx_email_logs_user ON public.email_logs(user_id);
CREATE INDEX idx_email_logs_status ON public.email_logs(status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.user_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Metrics: Users can read own, admins can read all
CREATE POLICY "Users can view own metrics" ON public.user_metrics
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage metrics" ON public.user_metrics
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "System can insert/update metrics" ON public.user_metrics
  FOR ALL USING (true); -- Requires security definer in functions

-- Automations: Admins only
CREATE POLICY "Admins can manage automations" ON public.email_automation_rules
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Email logs: Users can read own, admins all
CREATE POLICY "Users can view own emails" ON public.email_logs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage email logs" ON public.email_logs
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "System can insert email logs" ON public.email_logs
  FOR INSERT WITH CHECK (true);


-- ============================================
-- RPC: INCREMENT METRICS (Atomic update)
-- ============================================
CREATE OR REPLACE FUNCTION public.increment_user_metrics(
  p_user_id UUID,
  p_deposited DECIMAL DEFAULT 0,
  p_withdrawn DECIMAL DEFAULT 0,
  p_wagered DECIMAL DEFAULT 0,
  p_won DECIMAL DEFAULT 0,
  p_games_played INTEGER DEFAULT 0,
  p_games_won INTEGER DEFAULT 0
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_metrics (
    user_id, total_deposited, total_withdrawn, total_wagered, total_won, games_played, games_won, updated_at
  ) VALUES (
    p_user_id, COALESCE(p_deposited,0), COALESCE(p_withdrawn,0), COALESCE(p_wagered,0), COALESCE(p_won,0), COALESCE(p_games_played,0), COALESCE(p_games_won,0), NOW()
  )
  ON CONFLICT (user_id) DO UPDATE
  SET total_deposited = public.user_metrics.total_deposited + EXCLUDED.total_deposited,
      total_withdrawn = public.user_metrics.total_withdrawn + EXCLUDED.total_withdrawn,
      total_wagered = public.user_metrics.total_wagered + EXCLUDED.total_wagered,
      total_won = public.user_metrics.total_won + EXCLUDED.total_won,
      games_played = public.user_metrics.games_played + EXCLUDED.games_played,
      games_won = public.user_metrics.games_won + EXCLUDED.games_won,
      
      -- Update timestamps conditionally
      last_deposit_at = CASE WHEN EXCLUDED.total_deposited > 0 THEN NOW() ELSE public.user_metrics.last_deposit_at END,
      last_game_at = CASE WHEN EXCLUDED.games_played > 0 THEN NOW() ELSE public.user_metrics.last_game_at END,
      
      -- Simple LTV calculation (Total Depositado - Levantado)
      ltv = (public.user_metrics.total_deposited + EXCLUDED.total_deposited) - (public.user_metrics.total_withdrawn + EXCLUDED.total_withdrawn),
      
      -- Simple segmentation
      segment = CASE
        WHEN (public.user_metrics.total_deposited + EXCLUDED.total_deposited) > 1000 THEN 'vip'
        WHEN (public.user_metrics.last_game_at < NOW() - INTERVAL '30 days') THEN 'dormant'
        WHEN (public.user_metrics.last_game_at < NOW() - INTERVAL '7 days') THEN 'churning'
        WHEN (public.user_metrics.total_deposited + EXCLUDED.total_deposited) > 0 THEN 'active'
        ELSE 'new'
      END,
      
      updated_at = NOW();
END;
$$;
