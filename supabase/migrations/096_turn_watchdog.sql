-- ============================================
-- Migration 096: Turn Watchdog (motor de turno autoritativo)
-- Destrava partidas cujo jogador da vez abandonou/caiu, chamando a rota
-- protegida /api/games/tick periodicamente. A lógica de jogada fica no
-- código TS (uma fonte de verdade); este cron só dispara o tick.
-- ============================================

-- 1. Carimbo de quando o turno atual começou (base para detectar AFK)
ALTER TABLE public.games
  ADD COLUMN IF NOT EXISTS turn_started_at TIMESTAMPTZ DEFAULT NOW();

-- Índice para a varredura do watchdog (jogos em curso por antiguidade do turno)
CREATE INDEX IF NOT EXISTS idx_games_playing_turn
  ON public.games (status, turn_started_at);

-- ============================================
-- 2. Agendamento via pg_cron + pg_net
-- Requer as extensões pg_cron e pg_net habilitadas no projeto Supabase.
--
-- Os segredos NAO usam ALTER DATABASE (sem permissao no Supabase gerenciado).
-- Em vez disso ficam no Supabase Vault. ANTES de aplicar, crie os segredos
-- (no SQL Editor, uma vez):
--   SELECT vault.create_secret('https://clubedasueca.vercel.app', 'app_base_url');
--   SELECT vault.create_secret('<o mesmo valor de CRON_SECRET>', 'app_cron_secret');
-- (a função abaixo lê esses segredos do Vault; sem eles, o tick não é disparado.)
-- ============================================
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Função que dispara o tick (lê base_url e cron_secret do Supabase Vault)
CREATE OR REPLACE FUNCTION public.trigger_turn_watchdog()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_base_url TEXT;
  v_secret   TEXT;
BEGIN
  SELECT decrypted_secret INTO v_base_url
    FROM vault.decrypted_secrets WHERE name = 'app_base_url';
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets WHERE name = 'app_cron_secret';

  IF v_base_url IS NULL OR v_secret IS NULL THEN
    RAISE NOTICE 'app_base_url / app_cron_secret não estão no Vault; watchdog não disparado';
    RETURN;
  END IF;

  PERFORM net.http_post(
    url     := v_base_url || '/api/games/tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    body    := '{}'::jsonb
  );
END;
$$;

-- Remove agendamento anterior (idempotente em re-runs)
DO $$
BEGIN
  PERFORM cron.unschedule('turn-watchdog');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Roda a cada minuto (granularidade mínima do cron). A tolerância real de
-- 30s é aplicada dentro da rota /api/games/tick.
SELECT cron.schedule(
  'turn-watchdog',
  '* * * * *',
  $$ SELECT public.trigger_turn_watchdog(); $$
);
