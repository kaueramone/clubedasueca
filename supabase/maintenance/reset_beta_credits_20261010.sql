-- One-time maintenance, explicitly authorized 2026-10-10. NOT a deploy migration.
-- Preserves auth, profiles, support, community, game results and replay-prevention markers.
BEGIN;
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
LOCK TABLE auth.users, public.games, public.wallets, public.transactions, public.withdrawals,
 public.house_revenue, public.user_bonuses, public.affiliate_commissions, public.affiliates,
 public.affiliate_referrals, public.user_metrics, public.user_vip, public.promo_codes,
 private.welcome_credits IN ACCESS EXCLUSIVE MODE;
DO $$
DECLARE receipt jsonb;
BEGIN
 IF (SELECT mode FROM private.app_config WHERE singleton) IS DISTINCT FROM 'beta'
 OR EXISTS(SELECT 1 FROM public.wallets WHERE ledger_mode<>'beta')
 OR EXISTS(SELECT 1 FROM public.transactions WHERE ledger_mode<>'beta')
 OR EXISTS(SELECT 1 FROM public.withdrawals WHERE ledger_mode<>'beta')
 OR EXISTS(SELECT 1 FROM public.games WHERE ledger_mode<>'beta') THEN
  RAISE EXCEPTION 'Reset is restricted to a beta-only dataset';
 END IF;
 IF EXISTS(SELECT 1 FROM public.games WHERE status::text IN ('waiting','playing')) THEN
  RAISE EXCEPTION 'Active tables must finish before resetting balances';
 END IF;
 IF EXISTS(SELECT 1 FROM public.audit_logs WHERE action='beta_credit_reset_20261010') THEN
  RAISE EXCEPTION 'Reset already applied';
 END IF;
 SELECT jsonb_build_object('wallets', (SELECT count(*) FROM public.wallets),
  'previous_balance_total',(SELECT coalesce(sum(balance),0) FROM public.wallets),
  'transactions_deleted',(SELECT count(*) FROM public.transactions),
  'withdrawals_deleted',(SELECT count(*) FROM public.withdrawals),
  'user_bonuses_deleted',(SELECT count(*) FROM public.user_bonuses),
  'commissions_deleted',(SELECT count(*) FROM public.affiliate_commissions),
  'house_revenue_deleted',(SELECT count(*) FROM public.house_revenue),
  'currency','MZN','mode','beta','cutoff',now()) INTO receipt;
 DELETE FROM public.affiliate_commissions;
 DELETE FROM public.user_bonuses;
 DELETE FROM public.withdrawals;
 DELETE FROM public.transactions;
 DELETE FROM public.house_revenue;
 UPDATE public.wallets SET balance=0,currency='MZN',updated_at=now();
 UPDATE public.affiliates SET total_earned=0,total_paid=0,updated_at=now();
 UPDATE public.affiliate_referrals SET is_qualified=false,qualified_at=NULL;
 UPDATE public.promo_codes SET current_redemptions=0;
 UPDATE public.user_metrics SET total_deposited=0,total_withdrawn=0,total_wagered=0,total_won=0,last_deposit_at=NULL,ltv=0,updated_at=now();
 UPDATE public.user_vip SET points=0,lifetime_points=0,
  level_id=coalesce((SELECT id FROM public.vip_levels ORDER BY min_points,id LIMIT 1),level_id),updated_at=now();
 -- Existing users must not receive the welcome credit again after this cutoff.
 INSERT INTO private.welcome_credits(user_id) SELECT id FROM auth.users ON CONFLICT(user_id) DO NOTHING;
 INSERT INTO public.audit_logs(action,entity_type,details) VALUES('beta_credit_reset_20261010','beta_ledger',receipt);
END $$;
COMMIT;
