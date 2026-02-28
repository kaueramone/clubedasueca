-- ============================================
-- Migration 082: Update Withdrawal RPC
-- Remove the 1.00€ fixed fee from withdrawals
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
  v_withdrawal_id UUID;
BEGIN
  IF p_amount < 10 THEN
    RAISE EXCEPTION 'O valor mínimo de levantamento é 10€';
  END IF;

  -- Lock wallet
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

  -- Deduct balance
  UPDATE public.wallets
  SET balance = balance - p_amount, updated_at = NOW()
  WHERE id = v_wallet_id
  RETURNING balance INTO v_new_balance;

  -- Create withdrawal record
  INSERT INTO public.withdrawals (user_id, amount, status, pix_key)
  VALUES (p_user_id, p_amount, 'pending', p_pix_key)
  RETURNING id INTO v_withdrawal_id;

  -- Transaction record
  INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
  VALUES (v_wallet_id, -p_amount, 'withdrawal',
    format('Levantamento de %s€', p_amount), v_withdrawal_id);

  -- Audit
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'withdrawal_request', 'wallet', v_wallet_id,
    jsonb_build_object('amount', p_amount, 'new_balance', v_new_balance, 'withdrawal_id', v_withdrawal_id));

  RETURN jsonb_build_object(
    'success', true,
    'new_balance', v_new_balance,
    'withdrawal_id', v_withdrawal_id
  );
END;
$$;
