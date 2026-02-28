-- ============================================
-- Migration 083: Update Join Game with Preferred Team
-- Allow players to select Team A or B when joining a table
-- ============================================

-- Drop the old function so we can replace it with a new signature
DROP FUNCTION IF EXISTS public.process_join_game(UUID, UUID);

CREATE OR REPLACE FUNCTION public.process_join_game(
  p_user_id UUID,
  p_game_id UUID,
  p_preferred_team TEXT DEFAULT NULL
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
  v_seats_to_check INTEGER[];
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

  IF p_preferred_team = 'A' THEN
      v_seats_to_check := ARRAY[0, 2];
  ELSIF p_preferred_team = 'B' THEN
      v_seats_to_check := ARRAY[1, 3];
  ELSE
      v_seats_to_check := ARRAY[1, 2, 3, 0];
  END IF;

  FOREACH v_i IN ARRAY v_seats_to_check LOOP
    IF NOT (v_i = ANY(v_taken_positions)) THEN
      v_seat := v_i;
      EXIT;
    END IF;
  END LOOP;

  IF v_seat = -1 THEN
    IF p_preferred_team IS NOT NULL THEN
        RAISE EXCEPTION 'A equipa selecionada já está cheia';
    ELSE
        RAISE EXCEPTION 'Mesa cheia';
    END IF;
  END IF;

  -- Assign team based on seat
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
    jsonb_build_object('stake', v_stake, 'seat', v_seat, 'team', v_team));

  IF v_player_count = 4 THEN
    UPDATE public.games
    SET status = 'playing', updated_at = NOW()
    WHERE id = p_game_id;
    
    RETURN jsonb_build_object('success', true, 'game_id', p_game_id, 'game_started', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'game_id', p_game_id, 'seat_assigned', v_seat, 'team', v_team);
END;
$$;
