-- No exchange/conversion: beta wallets are standardized to MZN.
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.wallets WHERE currency<>'MZN' AND ledger_mode<>'beta') THEN
  RAISE EXCEPTION 'Real currency conversion requires a separate migration';
 END IF;
END $$;
UPDATE public.wallets SET currency='MZN' WHERE currency<>'MZN' AND ledger_mode='beta';
ALTER TABLE public.wallets ALTER COLUMN currency SET DEFAULT 'MZN';
ALTER TABLE public.wallets ADD CONSTRAINT wallets_currency_mzn CHECK(currency='MZN');
