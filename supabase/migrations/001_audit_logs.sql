-- ============================================
-- Migration 001: Audit Logs
-- Tabela de auditoria para todas as ações do sistema
-- ============================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,                -- 'deposit', 'withdrawal', 'bet', 'win', 'ban_user', 'promote_admin', etc.
  entity_type TEXT,                    -- 'wallet', 'game', 'profile', 'bonus', etc.
  entity_id UUID,                      -- ID da entidade afetada
  details JSONB DEFAULT '{}',          -- Payload completo da ação
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para consultas frequentes
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

-- RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins podem ver todos os logs
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
);

-- Qualquer operação pode inserir logs (via service role ou RPC)
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true);
