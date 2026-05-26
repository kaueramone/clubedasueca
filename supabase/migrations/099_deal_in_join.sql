-- ============================================
-- Migration 099: Distribuir cartas DENTRO do join (resolve R5)
-- Antes, o deal era disparado pelo navegador do 4º jogador após o join.
-- Se esse client falhasse entre o join e o deal, a mesa ficava 'playing'
-- sem cartas — travada. Agora o deal acontece na MESMA transação do join,
-- de forma atómica: ou o jogo começa com cartas, ou não começa.
--
-- ⚠️ Espelha src/features/game/utils.ts (generateDeck) e dealCardsForGame:
--    baralho = 4 naipes x 10 ranks; 10 cartas por jogador; trunfo = naipe de
--    uma carta aleatória; current_turn=1, trick=1, round=1.
-- ============================================

-- 1. Função de distribuição atómica
CREATE OR REPLACE FUNCTION public.deal_cards_for_game(p_game_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deck        TEXT[];
  v_players     UUID[];   -- ids de game_players ordenados por position
  v_trump_suit  TEXT;
  v_i           INTEGER;
BEGIN
  -- baralho embaralhado (4 naipes x 10 ranks = 40 cartas)
  SELECT array_agg(card ORDER BY random()) INTO v_deck
  FROM (
    SELECT s || '-' || r AS card
    FROM unnest(ARRAY['hearts','diamonds','clubs','spades']) s
    CROSS JOIN unnest(ARRAY['2','3','4','5','6','Q','J','K','7','A']) r
  ) t;

  -- jogadores por posição (0..3)
  SELECT array_agg(id ORDER BY position) INTO v_players
  FROM public.game_players WHERE game_id = p_game_id;

  IF array_length(v_players, 1) IS DISTINCT FROM 4 THEN
    RETURN; -- só distribui com 4 jogadores
  END IF;

  -- 10 cartas para cada jogador (fatias do deck)
  FOR v_i IN 0..3 LOOP
    UPDATE public.game_players
    SET hand = to_jsonb(v_deck[(v_i*10 + 1):(v_i*10 + 10)])
    WHERE id = v_players[v_i + 1];
  END LOOP;

  -- trunfo = naipe da 10ª carta do baralho embaralhado (carta aleatória)
  v_trump_suit := public.card_suit(v_deck[10]);

  UPDATE public.games SET
    trump_suit = v_trump_suit,
    current_turn = 1,
    current_trick = 1,
    current_round = 1,
    score_a = 0,
    score_b = 0,
    turn_started_at = NOW()
  WHERE id = p_game_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deal_cards_for_game(UUID) TO authenticated;

-- ============================================
-- 2. Atualizar process_join_game para distribuir as cartas na mesma transação
--    quando o 4º jogador entra. Mantém a assinatura e o resto da lógica do 087.
-- ============================================
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
  -- Lock game row
  SELECT status, stake INTO v_game_status, v_stake
  FROM public.games WHERE id = p_game_id FOR UPDATE;

  IF v_game_status IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado';
  END IF;

  -- Reconnect: já está na mesa
  SELECT id INTO v_existing
  FROM public.game_players
  WHERE game_id = p_game_id AND user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'game_id', p_game_id, 'already_joined', true);
  END IF;

  IF v_game_status != 'waiting' THEN
    RAISE EXCEPTION 'Jogo já começou ou terminou';
  END IF;

  -- Lock wallet
  SELECT id, balance INTO v_wallet_id, v_balance
  FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Carteira não encontrada';
  END IF;

  IF v_balance < v_stake THEN
    RAISE EXCEPTION 'Saldo insuficiente';
  END IF;

  -- Assento vazio
  SELECT array_agg(position) INTO v_taken_positions
  FROM public.game_players WHERE game_id = p_game_id;

  IF v_taken_positions IS NULL THEN
    v_taken_positions := ARRAY[]::INTEGER[];
  END IF;

  IF p_preferred_team = 'A' THEN
      v_seats_to_check := ARRAY[0, 2];
  ELSIF p_preferred_team = 'B' THEN
      v_seats_to_check := ARRAY[1, 3];
  ELSE
      v_seats_to_check := ARRAY[0, 1, 2, 3];
  END IF;

  FOREACH v_i IN ARRAY v_seats_to_check LOOP
    IF NOT (v_i = ANY(v_taken_positions)) THEN
      v_seat := v_i; EXIT;
    END IF;
  END LOOP;

  IF v_seat = -1 THEN
    IF p_preferred_team IS NOT NULL THEN
        RAISE EXCEPTION 'A equipa selecionada já está cheia';
    ELSE
        RAISE EXCEPTION 'Mesa cheia';
    END IF;
  END IF;

  v_team := CASE WHEN v_seat IN (0, 2) THEN 'A' ELSE 'B' END;

  INSERT INTO public.game_players (game_id, user_id, position, team)
  VALUES (p_game_id, p_user_id, v_seat, v_team);

  UPDATE public.wallets
  SET balance = balance - v_stake, updated_at = NOW()
  WHERE id = v_wallet_id;

  INSERT INTO public.transactions (wallet_id, amount, type, description, reference_id)
  VALUES (v_wallet_id, -v_stake, 'bet',
    format('Entrada na mesa %s', LEFT(p_game_id::text, 8)), p_game_id);

  SELECT count(*) INTO v_player_count
  FROM public.game_players WHERE game_id = p_game_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, details)
  VALUES (p_user_id, 'join_game', 'game', p_game_id,
    jsonb_build_object('stake', v_stake, 'seat', v_seat, 'team', v_team));

  IF v_player_count = 4 THEN
    UPDATE public.games
    SET status = 'playing', updated_at = NOW()
    WHERE id = p_game_id;

    -- R5: distribui as cartas AQUI, na mesma transação (atómico)
    PERFORM public.deal_cards_for_game(p_game_id);

    RETURN jsonb_build_object('success', true, 'game_id', p_game_id, 'game_started', true, 'dealt', true);
  END IF;

  RETURN jsonb_build_object('success', true, 'game_id', p_game_id, 'seat_assigned', v_seat, 'team', v_team);
END;
$$;
