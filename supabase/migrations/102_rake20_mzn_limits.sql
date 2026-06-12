-- ============================================
-- Migration 102: Rake 20% + Moeda MZN (créditos 1:1) + limites de depósito/saque
-- ------------------------------------------------------------------
-- Decisões aplicadas:
--   • Rake da casa: 10% -> 20% (alinha com a página "Como Funciona" e os Termos).
--   • Moeda do saldo: EUR -> MZN. 1 crédito = 1 MZN (1:1).
--   • Depósito mínimo: 50 MZN.  Saque mínimo: 250 MZN (saudável p/ o projeto,
--     reduz a frequência de saques pequenos e o custo das taxas de pagamento).
--   • Descrições de transação deixam de mencionar MB Way/€; passam a carteiras
--     móveis moçambicanas (M-Pesa / e-Mola / mKesh) e Meticais.
-- Tudo via CREATE OR REPLACE (segue o padrão das migrações 082/098 do repo).
-- ============================================

-- ----------------------------------------------------------------
-- 0. Carteiras: default MZN e converter saldos fictícios existentes
-- ----------------------------------------------------------------
ALTER TABLE public.wallets ALTER COLUMN currency SET DEFAULT 'MZN';
UPDATE public.wallets SET currency = 'MZN' WHERE currency = 'EUR';

-- ----------------------------------------------------------------
-- 1. process_deposit — mínimo 50 MZN + descrição de carteira móvel
-- ----------------------------------------------------------------
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
  -- 1 crédito = 1 MZN. Depósito mínimo de 50 MZN.
  IF p_amount < 50 THEN
    RAISE EXCEPTION 'O valor mínimo de depósito é 50 MZN';
  END IF;

  -- Lock da carteira para evitar corridas
  SELECT id INTO v_wallet_id
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;

  UPDATE public.wallets
  SET balance = balance + p_amount, updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.transactions (wallet_id, amount, type, description)
  VALUES (v_wallet_id, p_amount, 'deposit', 'Depósito via carteira móvel (M-Pesa / e-Mola / mKesh)')
  RETURNING id INTO v_tx_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'deposit', 'wallet', v_wallet_id,
    jsonb_build_object('amount', p_amount, 'currency', 'MZN', 'new_balance', v_new_balance, 'tx_id', v_tx_id));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'tx_id', v_tx_id);
END;
$$;

-- ----------------------------------------------------------------
-- 2. process_withdrawal — mínimo 250 MZN + descrição em Meticais
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.process_withdrawal(
  p_user_id UUID,
  p_amount DECIMAL,
  p_pix_key TEXT          -- mantém o nome da coluna; passa a guardar nº/carteira móvel
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance DECIMAL;
  v_new_balance DECIMAL;
  v_withdrawal_id UUID;
BEGIN
  IF p_amount < 250 THEN
    RAISE EXCEPTION 'O valor mínimo de levantamento é 250 MZN';
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  INSERT INTO public.withdrawals (user_id, amount, status, pix_key)
  VALUES (p_user_id, p_amount, 'pending', p_pix_key)
  RETURNING id INTO v_withdrawal_id;

  INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
  VALUES (v_wallet_id, -p_amount, 'withdrawal',
    format('Levantamento de %s MZN', p_amount), v_withdrawal_id);

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'withdrawal_request', 'wallet', v_wallet_id,
    jsonb_build_object('amount', p_amount, 'currency', 'MZN', 'new_balance', v_new_balance, 'withdrawal_id', v_withdrawal_id));

  RETURN jsonb_build_object('success', true, 'new_balance', v_new_balance, 'withdrawal_id', v_withdrawal_id);
END;
$$;

-- ----------------------------------------------------------------
-- 3. process_game_end — rake 20% (era 10%)
--    Pote = 4 x stake. Casa retém 20%. Dupla vencedora divide os 80%.
--    process_play_card (migração 098) chama esta função no fim do jogo.
-- ----------------------------------------------------------------
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
  SELECT stake INTO v_stake
  FROM public.games
  WHERE id = p_game_id AND status = 'playing'
  FOR UPDATE;

  IF v_stake IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado ou não está ativo';
  END IF;

  IF p_score_a > 60 THEN
    v_winner_team := 'A';
  ELSIF p_score_b > 60 THEN
    v_winner_team := 'B';
  ELSE
    v_winner_team := 'Draw';
  END IF;

  UPDATE public.games
  SET status = 'finished',
      score_a = p_score_a,
      score_b = p_score_b,
      winner_team = v_winner_team,
      updated_at = NOW()
  WHERE id = p_game_id;

  v_total_pot := v_stake * 4;
  v_house_fee := v_total_pot * 0.20;   -- RAKE 20%

  IF v_winner_team != 'Draw' THEN
    v_prize_per_player := (v_total_pot - v_house_fee) / 2;

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

    INSERT INTO public.house_revenue (game_id, amount)
    VALUES (p_game_id, v_house_fee);

  ELSE
    -- Empate: devolve a entrada a todos
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

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (NULL, 'game_end', 'game', p_game_id,
    jsonb_build_object('score_a', p_score_a, 'score_b', p_score_b,
      'winner_team', v_winner_team, 'total_pot', v_total_pot, 'house_fee', v_house_fee, 'rake_pct', 20));

  RETURN jsonb_build_object(
    'success', true,
    'winner_team', v_winner_team,
    'score_a', p_score_a,
    'score_b', p_score_b,
    'prize_per_player', CASE WHEN v_winner_team != 'Draw' THEN v_prize_per_player ELSE v_stake END
  );
END;
$$;
