-- ============================================
-- Migration 098: process_play_card (jogada atómica)
-- Resolve o R1 da auditoria: o playCard fazia 6 operações REST separadas,
-- sem lock — sujeito a corrida (jogada real + auto-play do watchdog ao mesmo
-- tempo podiam duplicar carta/pontos). Aqui tudo corre numa transação com
-- SELECT ... FOR UPDATE na linha do jogo, serializando jogadas da mesma mesa.
--
-- ⚠️ As funções de regra abaixo são um ESPELHO de src/features/game/utils.ts.
--    Se as regras mudarem no TS, ATUALIZAR aqui também (e vice-versa).
--    Referência (utils.ts):
--      valores: A=11, 7=10, K=4, J=3, Q=2, resto=0
--      força (ordem): 2,3,4,5,6,Q,J,K,7,A  (índice 0..9)
--      vencedor: trunfo bate tudo; senão maior força do naipe de saída
--      seguir naipe: se tem o naipe de saída, é obrigado a jogar dele
-- ============================================

-- naipe da carta ('hearts-A' -> 'hearts')
CREATE OR REPLACE FUNCTION public.card_suit(p_card TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT split_part(p_card, '-', 1);
$$;

-- rank da carta ('hearts-A' -> 'A')
CREATE OR REPLACE FUNCTION public.card_rank(p_card TEXT)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
  SELECT split_part(p_card, '-', 2);
$$;

-- valor em pontos
CREATE OR REPLACE FUNCTION public.card_value(p_card TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE public.card_rank(p_card)
    WHEN 'A' THEN 11 WHEN '7' THEN 10 WHEN 'K' THEN 4
    WHEN 'J' THEN 3 WHEN 'Q' THEN 2 ELSE 0 END;
$$;

-- força/ordem do rank (índice em 2,3,4,5,6,Q,J,K,7,A)
CREATE OR REPLACE FUNCTION public.card_strength(p_card TEXT)
RETURNS INTEGER LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE public.card_rank(p_card)
    WHEN '2' THEN 0 WHEN '3' THEN 1 WHEN '4' THEN 2 WHEN '5' THEN 3
    WHEN '6' THEN 4 WHEN 'Q' THEN 5 WHEN 'J' THEN 6 WHEN 'K' THEN 7
    WHEN '7' THEN 8 WHEN 'A' THEN 9 ELSE -1 END;
$$;

-- ============================================
-- process_play_card: valida e aplica uma jogada de forma atómica.
-- p_acting_user_id: o jogador que joga (o watchdog usa para jogar por AFK).
-- Retorna jsonb com 'success' ou 'error', e quando o jogo termina,
-- 'game_over'=true + dados para os efeitos colaterais em TS.
-- ============================================
CREATE OR REPLACE FUNCTION public.process_play_card(
  p_game_id UUID,
  p_card TEXT,
  p_acting_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_game            RECORD;
  v_player          RECORD;
  v_round           INTEGER;
  v_trick           INTEGER;
  v_hand            JSONB;
  v_lead_card       TEXT;
  v_lead_suit       TEXT;
  v_trick_count     INTEGER;
  v_has_lead        BOOLEAN;
  v_new_hand        JSONB;
  v_all_cards       TEXT[];
  v_all_players     UUID[];
  v_winner_id       UUID;
  v_winner          RECORD;
  v_best_card       TEXT;
  v_best_player     UUID;
  v_cur_card        TEXT;
  v_cur_player      UUID;
  v_i               INTEGER;
  v_trick_points    INTEGER := 0;
  v_is_team_a       BOOLEAN;
  v_new_score_a     INTEGER;
  v_new_score_b     INTEGER;
  v_next_pos        INTEGER;
  v_end_result      JSONB;
BEGIN
  -- LOCK da mesa: serializa jogadas concorrentes da mesma partida
  SELECT * INTO v_game FROM public.games WHERE id = p_game_id FOR UPDATE;

  IF v_game IS NULL OR v_game.status != 'playing' THEN
    RETURN jsonb_build_object('error', 'Jogo não está ativo');
  END IF;

  v_round := COALESCE(v_game.current_round, 1);
  v_trick := COALESCE(v_game.current_trick, 1);

  -- jogador que está a jogar
  SELECT * INTO v_player FROM public.game_players
  WHERE game_id = p_game_id AND user_id = p_acting_user_id;

  IF v_player IS NULL THEN
    RETURN jsonb_build_object('error', 'Não é um jogador desta mesa');
  END IF;

  -- é a vez dele?
  IF v_game.current_turn != v_player.position THEN
    RETURN jsonb_build_object('error', 'Não é a sua vez');
  END IF;

  -- a carta está na mão?
  v_hand := v_player.hand;
  IF NOT (v_hand ? p_card) THEN
    RETURN jsonb_build_object('error', 'Carta não está na sua mão');
  END IF;

  -- vaza atual (cartas já jogadas), em ordem
  SELECT count(*), min(card) FILTER (WHERE rn = 1)
  INTO v_trick_count, v_lead_card
  FROM (
    SELECT card, row_number() OVER (ORDER BY played_at ASC) AS rn
    FROM public.game_moves
    WHERE game_id = p_game_id AND round_number = v_round AND trick_number = v_trick
  ) t;

  v_lead_suit := CASE WHEN v_lead_card IS NULL THEN NULL ELSE public.card_suit(v_lead_card) END;

  -- seguir naipe: se tem o naipe de saída em mão, é obrigado a jogá-lo
  IF v_lead_suit IS NOT NULL AND public.card_suit(p_card) != v_lead_suit THEN
    SELECT EXISTS (
      SELECT 1 FROM jsonb_array_elements_text(v_hand) c
      WHERE public.card_suit(c) = v_lead_suit
    ) INTO v_has_lead;
    IF v_has_lead THEN
      RETURN jsonb_build_object('error', 'Tens de seguir o naipe de saída!');
    END IF;
  END IF;

  -- remove a carta da mão
  SELECT jsonb_agg(c) INTO v_new_hand
  FROM jsonb_array_elements_text(v_hand) c
  WHERE c != p_card;
  v_new_hand := COALESCE(v_new_hand, '[]'::jsonb);

  UPDATE public.game_players SET hand = v_new_hand WHERE id = v_player.id;

  -- regista o move
  INSERT INTO public.game_moves (game_id, player_id, card, round_number, trick_number)
  VALUES (p_game_id, p_acting_user_id, p_card, v_round, v_trick);

  -- vaza completa? (esta foi a 4ª carta)
  IF v_trick_count = 3 THEN
    -- reúne as 4 cartas da vaza, em ordem de jogada
    SELECT array_agg(card ORDER BY played_at), array_agg(player_id ORDER BY played_at)
    INTO v_all_cards, v_all_players
    FROM public.game_moves
    WHERE game_id = p_game_id AND round_number = v_round AND trick_number = v_trick;

    -- determina vencedor: trunfo bate tudo; senão maior força do naipe de saída
    v_lead_suit := public.card_suit(v_all_cards[1]);
    v_best_card := v_all_cards[1];
    v_best_player := v_all_players[1];

    FOR v_i IN 2..4 LOOP
      v_cur_card := v_all_cards[v_i];
      v_cur_player := v_all_players[v_i];

      IF public.card_suit(v_cur_card) = v_game.trump_suit
         AND public.card_suit(v_best_card) != v_game.trump_suit THEN
        -- atual é trunfo, melhor não era -> atual vence
        v_best_card := v_cur_card; v_best_player := v_cur_player;
      ELSIF public.card_suit(v_cur_card) = v_game.trump_suit
            AND public.card_suit(v_best_card) = v_game.trump_suit THEN
        -- ambos trunfo -> maior força
        IF public.card_strength(v_cur_card) > public.card_strength(v_best_card) THEN
          v_best_card := v_cur_card; v_best_player := v_cur_player;
        END IF;
      ELSIF public.card_suit(v_cur_card) != v_game.trump_suit
            AND public.card_suit(v_best_card) != v_game.trump_suit THEN
        -- nenhum trunfo -> só vence se for do naipe de saída e o melhor também, com mais força
        IF public.card_suit(v_cur_card) = v_lead_suit
           AND public.card_suit(v_best_card) = v_lead_suit
           AND public.card_strength(v_cur_card) > public.card_strength(v_best_card) THEN
          v_best_card := v_cur_card; v_best_player := v_cur_player;
        END IF;
      END IF;
    END LOOP;

    v_winner_id := v_best_player;
    SELECT * INTO v_winner FROM public.game_players
    WHERE game_id = p_game_id AND user_id = v_winner_id;

    -- pontos da vaza
    SELECT COALESCE(sum(public.card_value(c)), 0) INTO v_trick_points
    FROM unnest(v_all_cards) c;

    v_is_team_a := (v_winner.team = 'A');
    v_new_score_a := COALESCE(v_game.score_a, 0) + (CASE WHEN v_is_team_a THEN v_trick_points ELSE 0 END);
    v_new_score_b := COALESCE(v_game.score_b, 0) + (CASE WHEN NOT v_is_team_a THEN v_trick_points ELSE 0 END);

    -- guarda as cartas no tricks_won do vencedor
    UPDATE public.game_players
    SET tricks_won = COALESCE(tricks_won, '[]'::jsonb) || to_jsonb(v_all_cards)
    WHERE id = v_winner.id;

    IF v_trick >= 10 THEN
      -- fim de jogo: usa o RPC existente para distribuir prémio
      v_end_result := public.process_game_end(p_game_id, v_new_score_a, v_new_score_b);

      RETURN jsonb_build_object(
        'success', true,
        'game_over', true,
        'score_a', v_new_score_a,
        'score_b', v_new_score_b,
        'stake_amount', COALESCE(v_game.stake, 0),
        'winner_team', CASE WHEN v_new_score_a > 60 THEN 'A'
                            WHEN v_new_score_b > 60 THEN 'B' ELSE 'Draw' END,
        'end_result', v_end_result
      );
    ELSE
      -- próxima vaza: vencedor lidera
      UPDATE public.games SET
        current_turn = v_winner.position,
        current_trick = v_trick + 1,
        score_a = v_new_score_a,
        score_b = v_new_score_b,
        turn_started_at = NOW()
      WHERE id = p_game_id;

      RETURN jsonb_build_object('success', true, 'trick_complete', true, 'winner_position', v_winner.position);
    END IF;
  ELSE
    -- não é a última carta: avança o turno
    v_next_pos := (v_player.position + 1) % 4;
    UPDATE public.games SET
      current_turn = v_next_pos,
      turn_started_at = NOW()
    WHERE id = p_game_id;

    RETURN jsonb_build_object('success', true);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.process_play_card(UUID, TEXT, UUID) TO authenticated;
