-- ============================================
-- Migration 010: Promoções e Bónus
-- Sistema completo de bónus, VIP e promo codes
-- ============================================

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE bonus_type AS ENUM (
  'welcome',        -- Bónus de registo
  'deposit_match',  -- Match no depósito (ex: 100% até X€)
  'reload',         -- Bónus de recarga
  'free_play',      -- Jogo grátis (não deduz saldo)
  'cashback',       -- Cashback automático
  'promo_code',     -- Ativado via código
  'vip_reward'      -- Recompensa VIP
);

CREATE TYPE bonus_status AS ENUM ('active', 'paused', 'expired');
CREATE TYPE user_bonus_status AS ENUM ('active', 'completed', 'expired', 'cancelled');

-- ============================================
-- BONUSES (Configurados pelo admin)
-- ============================================
CREATE TABLE public.bonuses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type bonus_type NOT NULL,
  
  -- Valor: fixo OU percentual (um dos dois)
  amount DECIMAL(10,2),              -- Valor fixo (ex: 5€ grátis)
  percentage DECIMAL(5,2),           -- Percentual (ex: 100 = 100% match)
  max_amount DECIMAL(10,2),          -- Limite máximo do bónus
  min_deposit DECIMAL(10,2),         -- Depósito mínimo para ativar
  
  -- Rollover
  rollover_multiplier DECIMAL(5,2) DEFAULT 1, -- Ex: 5 = apostar 5x o valor do bónus
  
  -- Validade e limites
  valid_days INTEGER DEFAULT 30,     -- Dias para cumprir rollover
  max_uses INTEGER,                  -- NULL = ilimitado
  current_uses INTEGER DEFAULT 0,
  max_per_user INTEGER DEFAULT 1,    -- Quantas vezes cada user pode usar
  
  -- Segmentação
  user_segment TEXT DEFAULT 'all',   -- 'all', 'new', 'vip_bronze', 'vip_prata', etc.
  
  -- Estado
  status bonus_status DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ             -- NULL = sem data de expiração global
);

-- ============================================
-- USER_BONUSES (Bónus atribuídos a utilizadores)
-- ============================================
CREATE TABLE public.user_bonuses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  bonus_id UUID REFERENCES public.bonuses(id) NOT NULL,
  
  -- Valores
  amount DECIMAL(10,2) NOT NULL,     -- Valor real atribuído ao user
  wagered DECIMAL(10,2) DEFAULT 0,   -- Quanto já apostou (para rollover)
  rollover_target DECIMAL(10,2),     -- = amount * rollover_multiplier
  
  -- Estado
  status user_bonus_status DEFAULT 'active',
  activated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,            -- Data limite para cumprir rollover
  completed_at TIMESTAMPTZ,          -- Quando completou o rollover
  
  UNIQUE(user_id, bonus_id)          -- Evitar duplicações (simplificado)
);

-- ============================================
-- VIP_LEVELS (Definidos pelo admin)
-- ============================================
CREATE TABLE public.vip_levels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,                 -- 'Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante'
  min_points INTEGER NOT NULL DEFAULT 0,
  cashback_rate DECIMAL(5,2) DEFAULT 0,   -- Ex: 5 = 5% cashback
  bonus_multiplier DECIMAL(3,2) DEFAULT 1, -- Multiplicador de bónus
  benefits JSONB DEFAULT '[]',        -- Lista de benefícios extras em texto
  color TEXT DEFAULT '#CD7F32',       -- Cor do nível para UI
  icon TEXT DEFAULT '⭐',             -- Emoji/ícone
  sort_order INTEGER DEFAULT 0
);

-- Seed: Níveis VIP iniciais
INSERT INTO public.vip_levels (name, min_points, cashback_rate, bonus_multiplier, color, icon, sort_order) VALUES
  ('Bronze',   0,     2, 1.0,  '#CD7F32', '🥉', 1),
  ('Prata',    500,   3, 1.1,  '#C0C0C0', '🥈', 2),
  ('Ouro',     2000,  5, 1.25, '#FFD700', '🥇', 3),
  ('Platina',  5000,  7, 1.5,  '#E5E4E2', '💎', 4),
  ('Diamante', 15000, 10, 2.0, '#B9F2FF', '👑', 5);

-- ============================================
-- USER_VIP (Estado VIP de cada utilizador)
-- ============================================
CREATE TABLE public.user_vip (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  level_id INTEGER REFERENCES public.vip_levels(id) DEFAULT 1,
  points INTEGER DEFAULT 0,          -- Pontos no período atual
  lifetime_points INTEGER DEFAULT 0, -- Pontos totais (nunca resetam)
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROMO_CODES
-- ============================================
CREATE TABLE public.promo_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,          -- Ex: 'BEMVINDO2024'
  bonus_id UUID REFERENCES public.bonuses(id) ON DELETE CASCADE NOT NULL,
  max_redemptions INTEGER,            -- NULL = ilimitado
  current_redemptions INTEGER DEFAULT 0,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_bonuses_status ON public.bonuses(status);
CREATE INDEX idx_bonuses_type ON public.bonuses(type);
CREATE INDEX idx_user_bonuses_user ON public.user_bonuses(user_id);
CREATE INDEX idx_user_bonuses_status ON public.user_bonuses(status);
CREATE INDEX idx_user_vip_user ON public.user_vip(user_id);
CREATE INDEX idx_promo_codes_code ON public.promo_codes(code);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE public.bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_vip ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

-- Bonuses: todos podem ler os ativos, admins podem CRUD
CREATE POLICY "Anyone can view active bonuses" ON public.bonuses
  FOR SELECT USING (status = 'active');
CREATE POLICY "Admins can manage bonuses" ON public.bonuses
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- User Bonuses: user vê os seus, admins veem todos
CREATE POLICY "Users can view own bonuses" ON public.user_bonuses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user bonuses" ON public.user_bonuses
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "System can insert user bonuses" ON public.user_bonuses
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update user bonuses" ON public.user_bonuses
  FOR UPDATE USING (true);

-- VIP Levels: leitura pública
CREATE POLICY "Anyone can view VIP levels" ON public.vip_levels  
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage VIP levels" ON public.vip_levels
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));

-- User VIP: user vê o seu
CREATE POLICY "Users can view own VIP" ON public.user_vip
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user VIP" ON public.user_vip
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "System can insert user VIP" ON public.user_vip
  FOR INSERT WITH CHECK (true);
CREATE POLICY "System can update user VIP" ON public.user_vip
  FOR UPDATE USING (true);

-- Promo Codes: admins CRUD
CREATE POLICY "Admins can manage promo codes" ON public.promo_codes
  FOR ALL USING (auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin'));
CREATE POLICY "Anyone can view active codes" ON public.promo_codes
  FOR SELECT USING (is_active = true);


-- ============================================
-- RPC: APPLY BONUS (Atómico)
-- Aplica um bónus a um utilizador
-- ============================================
CREATE OR REPLACE FUNCTION public.apply_bonus(
  p_user_id UUID,
  p_bonus_id UUID,
  p_deposit_amount DECIMAL DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bonus RECORD;
  v_bonus_amount DECIMAL;
  v_rollover_target DECIMAL;
  v_expires_at TIMESTAMPTZ;
  v_existing_count INTEGER;
  v_wallet_id UUID;
  v_user_bonus_id UUID;
BEGIN
  -- Fetch bonus
  SELECT * INTO v_bonus FROM public.bonuses WHERE id = p_bonus_id AND status = 'active';
  IF v_bonus IS NULL THEN
    RAISE EXCEPTION 'Bónus não encontrado ou inativo';
  END IF;

  -- Check global usage limit
  IF v_bonus.max_uses IS NOT NULL AND v_bonus.current_uses >= v_bonus.max_uses THEN
    RAISE EXCEPTION 'Bónus esgotado';
  END IF;

  -- Check per-user limit
  SELECT count(*) INTO v_existing_count
  FROM public.user_bonuses
  WHERE user_id = p_user_id AND bonus_id = p_bonus_id;

  IF v_existing_count >= v_bonus.max_per_user THEN
    RAISE EXCEPTION 'Já utilizou este bónus o número máximo de vezes';
  END IF;

  -- Check min deposit for deposit-type bonuses
  IF v_bonus.type IN ('deposit_match', 'reload') AND p_deposit_amount < COALESCE(v_bonus.min_deposit, 0) THEN
    RAISE EXCEPTION 'Depósito mínimo não atingido para este bónus';
  END IF;

  -- Calculate bonus amount
  IF v_bonus.percentage IS NOT NULL THEN
    v_bonus_amount := p_deposit_amount * (v_bonus.percentage / 100);
    IF v_bonus.max_amount IS NOT NULL AND v_bonus_amount > v_bonus.max_amount THEN
      v_bonus_amount := v_bonus.max_amount;
    END IF;
  ELSE
    v_bonus_amount := COALESCE(v_bonus.amount, 0);
  END IF;

  IF v_bonus_amount <= 0 THEN
    RAISE EXCEPTION 'Valor do bónus inválido';
  END IF;

  -- Calculate rollover target
  v_rollover_target := v_bonus_amount * COALESCE(v_bonus.rollover_multiplier, 1);

  -- Calculate expiry
  v_expires_at := NOW() + (COALESCE(v_bonus.valid_days, 30) || ' days')::INTERVAL;

  -- Create user_bonus record
  INSERT INTO public.user_bonuses (user_id, bonus_id, amount, rollover_target, expires_at)
  VALUES (p_user_id, p_bonus_id, v_bonus_amount, v_rollover_target, v_expires_at)
  RETURNING id INTO v_user_bonus_id;

  -- Credit bonus to wallet
  SELECT id INTO v_wallet_id FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_wallet_id IS NOT NULL THEN
    UPDATE public.wallets SET balance = balance + v_bonus_amount, updated_at = NOW()
    WHERE id = v_wallet_id;

    INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
    VALUES (v_wallet_id, v_bonus_amount, 'bonus',
      format('Bónus: %s', v_bonus.name), v_user_bonus_id);
  END IF;

  -- Increment usage counter
  UPDATE public.bonuses SET current_uses = current_uses + 1, updated_at = NOW()
  WHERE id = p_bonus_id;

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'bonus_applied', 'bonus', p_bonus_id,
    jsonb_build_object('bonus_name', v_bonus.name, 'amount', v_bonus_amount, 'rollover_target', v_rollover_target));

  RETURN jsonb_build_object(
    'success', true,
    'user_bonus_id', v_user_bonus_id,
    'amount', v_bonus_amount,
    'rollover_target', v_rollover_target,
    'expires_at', v_expires_at
  );
END;
$$;


-- ============================================
-- RPC: REDEEM PROMO CODE (Atómico)
-- ============================================
CREATE OR REPLACE FUNCTION public.redeem_promo_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_promo RECORD;
BEGIN
  -- Fetch promo code
  SELECT * INTO v_promo FROM public.promo_codes
  WHERE code = UPPER(TRIM(p_code)) AND is_active = true;

  IF v_promo IS NULL THEN
    RAISE EXCEPTION 'Código promocional inválido ou expirado';
  END IF;

  -- Check validity period
  IF v_promo.valid_from > NOW() THEN
    RAISE EXCEPTION 'Código ainda não está ativo';
  END IF;
  IF v_promo.valid_until IS NOT NULL AND v_promo.valid_until < NOW() THEN
    RAISE EXCEPTION 'Código expirado';
  END IF;

  -- Check redemption limit
  IF v_promo.max_redemptions IS NOT NULL AND v_promo.current_redemptions >= v_promo.max_redemptions THEN
    RAISE EXCEPTION 'Código esgotado';
  END IF;

  -- Increment redemption counter
  UPDATE public.promo_codes SET current_redemptions = current_redemptions + 1
  WHERE id = v_promo.id;

  -- Apply the linked bonus
  RETURN public.apply_bonus(p_user_id, v_promo.bonus_id, 0);
END;
$$;


-- ============================================
-- RPC: UPDATE WAGERED (chamado após cada bet)
-- Atualiza o wagered de bónus ativos
-- ============================================
CREATE OR REPLACE FUNCTION public.update_bonus_wagered(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_bonus RECORD;
BEGIN
  -- Update all active bonuses for this user
  FOR v_bonus IN
    SELECT id, wagered, rollover_target
    FROM public.user_bonuses
    WHERE user_id = p_user_id AND status = 'active'
  LOOP
    UPDATE public.user_bonuses
    SET wagered = wagered + p_amount,
        status = CASE
          WHEN (wagered + p_amount) >= rollover_target THEN 'completed'::user_bonus_status
          ELSE 'active'::user_bonus_status
        END,
        completed_at = CASE
          WHEN (wagered + p_amount) >= rollover_target THEN NOW()
          ELSE NULL
        END
    WHERE id = v_bonus.id;
  END LOOP;
  
  -- Expire any bonuses past their date
  UPDATE public.user_bonuses
  SET status = 'expired'
  WHERE user_id = p_user_id
    AND status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$;


-- ============================================
-- RPC: ADD VIP POINTS
-- ============================================
CREATE OR REPLACE FUNCTION public.add_vip_points(
  p_user_id UUID,
  p_points INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_vip RECORD;
  v_new_points INTEGER;
  v_new_lifetime INTEGER;
  v_new_level_id INTEGER;
  v_new_level_name TEXT;
  v_leveled_up BOOLEAN := FALSE;
BEGIN
  -- Upsert user_vip
  INSERT INTO public.user_vip (user_id, level_id, points, lifetime_points)
  VALUES (p_user_id, 1, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE
  SET points = public.user_vip.points + p_points,
      lifetime_points = public.user_vip.lifetime_points + p_points,
      updated_at = NOW()
  RETURNING points, lifetime_points INTO v_new_points, v_new_lifetime;

  -- Check for level up based on lifetime points
  SELECT id, name INTO v_new_level_id, v_new_level_name
  FROM public.vip_levels
  WHERE min_points <= v_new_lifetime
  ORDER BY min_points DESC
  LIMIT 1;

  -- Get current level
  SELECT level_id INTO v_vip FROM public.user_vip WHERE user_id = p_user_id;

  IF v_new_level_id IS NOT NULL AND v_new_level_id != v_vip.level_id THEN
    UPDATE public.user_vip SET level_id = v_new_level_id WHERE user_id = p_user_id;
    v_leveled_up := TRUE;

    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
    VALUES (p_user_id, 'vip_level_up', 'user_vip', p_user_id,
      jsonb_build_object('new_level', v_new_level_name, 'lifetime_points', v_new_lifetime));
  END IF;

  RETURN jsonb_build_object(
    'points', v_new_points,
    'lifetime_points', v_new_lifetime,
    'level_id', COALESCE(v_new_level_id, 1),
    'leveled_up', v_leveled_up,
    'level_name', v_new_level_name
  );
END;
$$;
