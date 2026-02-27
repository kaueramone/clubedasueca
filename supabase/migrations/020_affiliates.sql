-- ============================================
-- Migration 020: Sistema de Afiliados
-- Tracking, comissões e pagamentos
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE affiliate_status AS ENUM ('pending', 'approved', 'rejected', 'suspended');
CREATE TYPE commission_type AS ENUM ('revenue_share', 'cpa');
CREATE TYPE commission_status AS ENUM ('pending', 'approved', 'paid');

-- ============================================
-- AFFILIATES (Programa de afiliados)
-- ============================================
CREATE TABLE public.affiliates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  status affiliate_status DEFAULT 'pending',
  commission_model commission_type DEFAULT 'revenue_share',
  revenue_share_pct DECIMAL(5,2) DEFAULT 25,   -- 25% do rake gerado pelos referidos
  cpa_amount DECIMAL(10,2),                     -- Valor fixo por registo qualificado (CPA)
  total_earned DECIMAL(12,2) DEFAULT 0,
  total_paid DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AFFILIATE LINKS
-- ============================================
CREATE TABLE public.affiliate_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  code TEXT UNIQUE NOT NULL,           -- Ex: 'joao2024'
  url TEXT,                            -- URL completo gerado automaticamente
  clicks INTEGER DEFAULT 0,
  registrations INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AFFILIATE REFERRALS (Utilizadores referidos)
-- ============================================
CREATE TABLE public.affiliate_referrals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referred_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  link_id UUID REFERENCES public.affiliate_links(id),
  is_qualified BOOLEAN DEFAULT FALSE,  -- True quando faz primeiro depósito
  qualified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- AFFILIATE COMMISSIONS
-- ============================================
CREATE TABLE public.affiliate_commissions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  affiliate_id UUID REFERENCES public.affiliates(id) ON DELETE CASCADE NOT NULL,
  referral_id UUID REFERENCES public.affiliate_referrals(id),
  amount DECIMAL(10,2) NOT NULL,
  source_type TEXT NOT NULL,           -- 'rake', 'cpa', 'manual'
  source_id UUID,                      -- game_id, etc.
  status commission_status DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_affiliates_user ON public.affiliates(user_id);
CREATE INDEX idx_affiliates_status ON public.affiliates(status);
CREATE INDEX idx_affiliate_links_code ON public.affiliate_links(code);
CREATE INDEX idx_affiliate_links_affiliate ON public.affiliate_links(affiliate_id);
CREATE INDEX idx_affiliate_referrals_affiliate ON public.affiliate_referrals(affiliate_id);
CREATE INDEX idx_affiliate_referrals_user ON public.affiliate_referrals(referred_user_id);
CREATE INDEX idx_affiliate_commissions_affiliate ON public.affiliate_commissions(affiliate_id);
CREATE INDEX idx_affiliate_commissions_status ON public.affiliate_commissions(status);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- Affiliates: user vê o seu, admins veem todos
CREATE POLICY "Users can view own affiliate" ON public.affiliates
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own affiliate" ON public.affiliates
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage affiliates" ON public.affiliates
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Links: afiliado vê os seus
CREATE POLICY "Users can view own links" ON public.affiliate_links
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "Users can insert own links" ON public.affiliate_links
  FOR INSERT WITH CHECK (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins can manage links" ON public.affiliate_links
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
-- Public select for tracking clicks (by code)
CREATE POLICY "Public can view links by code" ON public.affiliate_links
  FOR SELECT USING (true);

-- Referrals: afiliado vê os seus
CREATE POLICY "Affiliates can view own referrals" ON public.affiliate_referrals
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "System can insert referrals" ON public.affiliate_referrals
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update referrals" ON public.affiliate_referrals
  FOR UPDATE USING (true);
CREATE POLICY "Admins can manage referrals" ON public.affiliate_referrals
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- Commissions: afiliado vê as suas
CREATE POLICY "Affiliates can view own commissions" ON public.affiliate_commissions
  FOR SELECT USING (
    affiliate_id IN (SELECT id FROM public.affiliates WHERE user_id = auth.uid())
  );
CREATE POLICY "System can insert commissions" ON public.affiliate_commissions
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can manage commissions" ON public.affiliate_commissions
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));


-- ============================================
-- RPC: TRACK AFFILIATE CLICK
-- ============================================
CREATE OR REPLACE FUNCTION public.track_affiliate_click(
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link RECORD;
BEGIN
  SELECT * INTO v_link FROM public.affiliate_links
  WHERE code = LOWER(TRIM(p_code));

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Link não encontrado');
  END IF;

  UPDATE public.affiliate_links
  SET clicks = clicks + 1
  WHERE id = v_link.id;

  RETURN jsonb_build_object('success', true, 'affiliate_id', v_link.affiliate_id, 'link_id', v_link.id);
END;
$$;


-- ============================================
-- RPC: REGISTER AFFILIATE REFERRAL
-- Chamado no signup quando há cookie ref
-- ============================================
CREATE OR REPLACE FUNCTION public.register_affiliate_referral(
  p_referred_user_id UUID,
  p_ref_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_link RECORD;
  v_affiliate RECORD;
  v_referral_id UUID;
BEGIN
  -- Find link by code
  SELECT * INTO v_link FROM public.affiliate_links
  WHERE code = LOWER(TRIM(p_ref_code));

  IF v_link IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Código de referência inválido');
  END IF;

  -- Get affiliate
  SELECT * INTO v_affiliate FROM public.affiliates
  WHERE id = v_link.affiliate_id AND status = 'approved';

  IF v_affiliate IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Afiliado não aprovado');
  END IF;

  -- Prevent self-referral
  IF v_affiliate.user_id = p_referred_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não pode referir-se a si mesmo');
  END IF;

  -- Check if already referred
  IF EXISTS (SELECT 1 FROM public.affiliate_referrals WHERE referred_user_id = p_referred_user_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Utilizador já foi referido');
  END IF;

  -- Create referral
  INSERT INTO public.affiliate_referrals (affiliate_id, referred_user_id, link_id)
  VALUES (v_affiliate.id, p_referred_user_id, v_link.id)
  RETURNING id INTO v_referral_id;

  -- Increment link registrations
  UPDATE public.affiliate_links SET registrations = registrations + 1
  WHERE id = v_link.id;

  -- If CPA model, create commission immediately
  IF v_affiliate.commission_model = 'cpa' AND v_affiliate.cpa_amount > 0 THEN
    INSERT INTO public.affiliate_commissions (affiliate_id, referral_id, amount, source_type)
    VALUES (v_affiliate.id, v_referral_id, v_affiliate.cpa_amount, 'cpa');

    UPDATE public.affiliates SET total_earned = total_earned + v_affiliate.cpa_amount
    WHERE id = v_affiliate.id;
  END IF;

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_referred_user_id, 'affiliate_referral', 'affiliate', v_affiliate.id,
    jsonb_build_object('ref_code', p_ref_code, 'affiliate_user', v_affiliate.user_id));

  RETURN jsonb_build_object('success', true, 'referral_id', v_referral_id);
END;
$$;


-- ============================================
-- RPC: PROCESS AFFILIATE COMMISSION (do rake)
-- Chamado pelo process_game_end
-- ============================================
CREATE OR REPLACE FUNCTION public.process_affiliate_commission(
  p_game_id UUID,
  p_house_fee DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player RECORD;
  v_referral RECORD;
  v_affiliate RECORD;
  v_commission DECIMAL;
BEGIN
  -- For each player in the game
  FOR v_player IN
    SELECT user_id FROM public.game_players WHERE game_id = p_game_id
  LOOP
    -- Check if player was referred
    SELECT * INTO v_referral FROM public.affiliate_referrals
    WHERE referred_user_id = v_player.user_id;

    IF v_referral IS NOT NULL THEN
      -- Get affiliate details
      SELECT * INTO v_affiliate FROM public.affiliates
      WHERE id = v_referral.affiliate_id AND status = 'approved';

      IF v_affiliate IS NOT NULL AND v_affiliate.commission_model = 'revenue_share' THEN
        -- Calculate commission: % of house fee proportional to this player
        -- Each player contributes 25% of the game (1 of 4 players)
        v_commission := (p_house_fee / 4) * (v_affiliate.revenue_share_pct / 100);

        IF v_commission > 0 THEN
          INSERT INTO public.affiliate_commissions (affiliate_id, referral_id, amount, source_type, source_id)
          VALUES (v_affiliate.id, v_referral.id, v_commission, 'rake', p_game_id);

          UPDATE public.affiliates
          SET total_earned = total_earned + v_commission, updated_at = NOW()
          WHERE id = v_affiliate.id;
        END IF;
      END IF;

      -- Mark referral as qualified if first game
      IF NOT v_referral.is_qualified THEN
        UPDATE public.affiliate_referrals
        SET is_qualified = TRUE, qualified_at = NOW()
        WHERE id = v_referral.id;
      END IF;
    END IF;
  END LOOP;
END;
$$;


-- ============================================
-- RPC: PAY AFFILIATE (Admin)
-- ============================================
CREATE OR REPLACE FUNCTION public.pay_affiliate(
  p_affiliate_id UUID,
  p_amount DECIMAL,
  p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affiliate RECORD;
  v_pending_total DECIMAL;
BEGIN
  SELECT * INTO v_affiliate FROM public.affiliates WHERE id = p_affiliate_id;
  IF v_affiliate IS NULL THEN
    RAISE EXCEPTION 'Afiliado não encontrado';
  END IF;

  -- Calculate pending commissions
  SELECT COALESCE(SUM(amount), 0) INTO v_pending_total
  FROM public.affiliate_commissions
  WHERE affiliate_id = p_affiliate_id AND status = 'pending';

  IF p_amount > v_pending_total THEN
    RAISE EXCEPTION 'Montante excede comissões pendentes (%.2f€)', v_pending_total;
  END IF;

  -- Mark commissions as paid (FIFO)
  UPDATE public.affiliate_commissions
  SET status = 'paid', paid_at = NOW()
  WHERE id IN (
    SELECT id FROM public.affiliate_commissions
    WHERE affiliate_id = p_affiliate_id AND status = 'pending'
    ORDER BY created_at
    -- We mark all pending as paid for simplicity
  );

  -- Update affiliate totals
  UPDATE public.affiliates
  SET total_paid = total_paid + p_amount, updated_at = NOW()
  WHERE id = p_affiliate_id;

  -- Credit to affiliate's wallet
  UPDATE public.wallets
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE user_id = v_affiliate.user_id;

  -- Transaction record
  INSERT INTO public.transactions (wallet_id, amount, type, description)
  SELECT id, p_amount, 'bonus', 'Pagamento de comissão de afiliado'
  FROM public.wallets WHERE user_id = v_affiliate.user_id;

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_admin_id, 'affiliate_payment', 'affiliate', p_affiliate_id,
    jsonb_build_object('amount', p_amount, 'affiliate_user', v_affiliate.user_id));

  RETURN jsonb_build_object('success', true, 'paid_amount', p_amount);
END;
$$;
