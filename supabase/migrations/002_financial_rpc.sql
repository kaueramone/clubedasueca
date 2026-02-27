-- ============================================
-- Migration 002: Financial RPC Functions
-- Operações financeiras atómicas com BEGIN/COMMIT/ROLLBACK
-- ============================================

-- ============================================
-- 1. PROCESS DEPOSIT (Atómico)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_deposit(
  p_user_id UUID,
  p_amount DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_new_balance DECIMAL;
  v_tx_id UUID;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor inválido: deve ser positivo';
  END IF;

  -- Lock wallet row to prevent race conditions
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;

  -- Update balance
  UPDATE public.wallets
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Insert transaction
  INSERT INTO public.transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, p_amount, 'deposit', 'Depósito via MB Way')
  RETURNING id INTO v_tx_id;

  -- Audit log
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'deposit', 'wallet', v_wallet_id,
    jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance, 'tx_id', v_tx_id));

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'tx_id', v_tx_id
  );
END;
$$;


-- ============================================
-- 2. PROCESS WITHDRAWAL (Atómico)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL,
  p_pix_key TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance DECIMAL;
  v_new_balance DECIMAL;
  v_fee DECIMAL := 1.00;
  v_total DECIMAL;
  v_withdrawal_id UUID;
BEGIN
  IF p_amount < 10 THEN
    RAISE EXCEPTION 'O valor mínimo de levantamento é 10€';
  END IF;

  v_total := p_amount + v_fee;

  -- Lock wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;

  IF v_balance < v_total THEN
    RAISE EXCEPTION 'Saldo insuficiente (incluindo taxa de 1€)';
  END IF;

  -- Deduct balance
  UPDATE public.wallets
  SET balance = balance - v_total, updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Create withdrawal record
  INSERT INTO public.withdrawals (user_id, amount, status, pix_key)
  VALUES (p_user_id, p_amount, 'pending', p_pix_key)
  RETURNING id INTO v_withdrawal_id;

  -- Transaction record
  INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
  VALUES (v_wallet_id, -v_total, 'withdrawal',
    format('Levantamento de %s€ + 1€ taxa', p_amount), v_withdrawal_id);

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'withdrawal_request', 'wallet', v_wallet_id,
    jsonb_build_object('amount', p_amount, 'fee', v_fee, 'new_balance', v_new_balance, 'withdrawal_id', v_withdrawal_id));

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'withdrawal_id', v_withdrawal_id
  );
END;
$$;


-- ============================================
-- 3. PROCESS CREATE GAME (Atómico)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_create_game(
  p_user_id UUID,
  p_stake DECIMAL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance DECIMAL;
  v_game_id UUID;
BEGIN
  IF p_stake <= 0 THEN
    RAISE EXCEPTION 'Valor de aposta inválido';
  END IF;

  -- Lock wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;

  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'Saldo insuficiente para cobrir a aposta';
  END IF;

  -- Create game
  INSERT INTO public.games (host_id, stake, status)
  VALUES (p_user_id, p_stake, 'waiting')
  RETURNING id INTO v_game_id;

  -- Add host as player (Position 0, Team A)
  INSERT INTO public.game_players (game_id, user_id, position, team)
  VALUES (v_game_id, p_user_id, 0, 'A');

  -- Deduct stake (escrow)
  UPDATE public.wallets
  SET balance = balance - p_stake, updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Transaction record
  INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
  VALUES (v_wallet_id, -p_stake, 'bet',
    format('Entrada na mesa %s', LEFT(v_game_id::text, 8)), v_game_id);

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'create_game', 'game', v_game_id,
    jsonb_build_object('stake', p_stake, 'game_id', v_game_id));

  RETURN jsonb_build_object(
    'success', true,
    'game_id', v_game_id
  );
END;
$$;


-- ============================================
-- 4. PROCESS JOIN GAME (Atómico)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_join_game(
  p_user_id UUID,
  p_game_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance DECIMAL;
  v_game_status TEXT;
  v_stake DECIMAL;
  v_taken_positions INTEGER[];
  v_seat INTEGER := -1;
  v_team TEXT;
  v_player_count INTEGER;
  v_existing UUID;
  v_i INTEGER;
BEGIN
  -- Check if already in game
  SELECT id INTO v_existing
  FROM public.game_players
  WHERE game_id = p_game_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'game_id', p_game_id, 'already_joined', true);
  END IF;

  -- Lock game row
  SELECT status, stake INTO v_game_status, v_stake
  FROM public.games
  WHERE id = p_game_id
  FOR UPDATE;

  IF v_game_status IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  IF v_game_status != 'waiting' THEN
    RAISE EXCEPTION 'Jogo já começou ou terminou';
  END IF;

  -- Lock wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;

  IF v_balance < v_stake THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Find empty seat
  SELECT array_agg(position) INTO v_taken_positions
  FROM public.game_players
  WHERE game_id = p_game_id;

  IF v_taken_positions IS NULL THEN
    v_taken_positions := ARRAY[]::INTEGER[];
  END IF;

  FOR v_i IN 0..3 LOOP
    IF NOT (v_i = ANY(v_taken_positions)) THEN
      v_seat := v_i;
      EXIT;
    END IF;
  END LOOP;

  IF v_seat = -1 THEN
    RAISE EXCEPTION 'Mesa cheia';
  END IF;

  -- Assign team
  v_team := CASE WHEN v_seat IN (0, 2) THEN 'A' ELSE 'B' END;

  -- Insert player
  INSERT INTO public.game_players (game_id, user_id, position, team)
  VALUES (p_game_id, p_user_id, v_seat, v_team);

  -- Deduct stake
  UPDATE public.wallets
  SET balance = balance - v_stake, updated_at = NOW()
  WHERE id = v_wallet_id;

  -- Transaction record
  INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
  VALUES (v_wallet_id, -v_stake, 'bet',
    format('Entrada na mesa %s', LEFT(p_game_id::text, 8)), p_game_id);

  -- Count players now
  SELECT count(*) INTO v_player_count
  FROM public.game_players
  WHERE game_id = p_game_id;

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'join_game', 'game', p_game_id,
    jsonb_build_object('seat', v_seat, 'team', v_team, 'player_count', v_player_count));

  -- If table is full (4 players), mark as ready for dealing
  -- (Card dealing handled in server action because it needs JS utils)
  IF v_player_count = 4 THEN
    UPDATE public.games
    SET status = 'playing', updated_at = NOW()
    WHERE id = p_game_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'game_id', p_game_id,
    'seat', v_seat,
    'team', v_team,
    'player_count', v_player_count,
    'game_started', (v_player_count = 4)
  );
END;
$$;


-- ============================================
-- 5. PROCESS GAME END (Atómico)
-- ============================================
CREATE OR REPLACE FUNCTION public.process_game_end(
  p_game_id UUID,
  p_score_a INTEGER,
  p_score_b INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stake DECIMAL;
  v_winner_team TEXT;
  v_total_pot DECIMAL;
  v_house_fee DECIMAL;
  v_prize_per_player DECIMAL;
  v_player RECORD;
  v_wallet_id UUID;
BEGIN
  -- Lock game
  SELECT stake INTO v_stake
  FROM public.games
  WHERE id = p_game_id AND status = 'playing'
  FOR UPDATE;

  IF v_stake IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado ou não está ativo';
  END IF;

  -- Determine winner
  IF p_score_a > 60 THEN
    v_winner_team := 'A';
  ELSIF p_score_b > 60 THEN
    v_winner_team := 'B';
  ELSE
    v_winner_team := 'Draw';
  END IF;

  -- Update game status
  UPDATE public.games
  SET status = 'finished',
      score_a = p_score_a,
      score_b = p_score_b,
      winner_team = v_winner_team,
      updated_at = NOW()
  WHERE id = p_game_id;

  -- Calculate prizes
  v_total_pot := v_stake * 4;
  v_house_fee := v_total_pot * 0.10;

  IF v_winner_team != 'Draw' THEN
    v_prize_per_player := (v_total_pot - v_house_fee) / 2;

    -- Distribute to winning team
    FOR v_player IN
      SELECT gp.user_id
      FROM public.game_players gp
      WHERE gp.game_id = p_game_id AND gp.team = v_winner_team
    LOOP
      SELECT id INTO v_wallet_id
      FROM public.wallets
      WHERE user_id = v_player.user_id
      FOR UPDATE;

      UPDATE public.wallets
      SET balance = balance + v_prize_per_player, updated_at = NOW()
      WHERE id = v_wallet_id;

      INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
      VALUES (v_wallet_id, v_prize_per_player, 'win',
        format('Vitória na mesa %s', LEFT(p_game_id::text, 8)), p_game_id);
    END LOOP;

    -- Record house revenue
    INSERT INTO public.house_revenue (game_id, amount)
    VALUES (p_game_id, v_house_fee);

  ELSE
    -- Draw: refund all players
    FOR v_player IN
      SELECT gp.user_id
      FROM public.game_players gp
      WHERE gp.game_id = p_game_id
    LOOP
      SELECT id INTO v_wallet_id
      FROM public.wallets
      WHERE user_id = v_player.user_id
      FOR UPDATE;

      UPDATE public.wallets
      SET balance = balance + v_stake, updated_at = NOW()
      WHERE id = v_wallet_id;

      INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
      VALUES (v_wallet_id, v_stake, 'refund',
        format('Empate na mesa %s', LEFT(p_game_id::text, 8)), p_game_id);
    END LOOP;
  END IF;

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'game_end', 'game', p_game_id,
    jsonb_build_object(
      'score_a', p_score_a,
      'score_b', p_score_b,
      'winner_team', v_winner_team,
      'total_pot', v_total_pot,
      'house_fee', v_house_fee
    ));

  RETURN jsonb_build_object(
    'success', true,
    'winner_team', v_winner_team,
    'score_a', p_score_a,
    'score_b', p_score_b,
    'prize_per_player', CASE WHEN v_winner_team != 'Draw' THEN v_prize_per_player ELSE v_stake END
  );
END;
$$;
