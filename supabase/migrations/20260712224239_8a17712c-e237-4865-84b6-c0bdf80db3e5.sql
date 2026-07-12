
-- 1) VIP plan pricing extensions
ALTER TABLE public.vip_plans
  ADD COLUMN IF NOT EXISTS price_usd_cents integer,
  ADD COLUMN IF NOT EXISTS price_egp_cents integer,
  ADD COLUMN IF NOT EXISTS is_recommended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS discount_percent integer NOT NULL DEFAULT 0;

UPDATE public.vip_plans
   SET price_usd_cents = COALESCE(price_usd_cents, price_cents)
 WHERE price_usd_cents IS NULL;

-- 2) Coin packages
CREATE TABLE IF NOT EXISTS public.coin_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  coins integer NOT NULL CHECK (coins > 0),
  bonus_coins integer NOT NULL DEFAULT 0 CHECK (bonus_coins >= 0),
  price_usd_cents integer,
  price_egp_cents integer,
  is_popular boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coin_packages TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.coin_packages TO authenticated;
GRANT ALL ON public.coin_packages TO service_role;

ALTER TABLE public.coin_packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coin_packages_public_read" ON public.coin_packages;
CREATE POLICY "coin_packages_public_read" ON public.coin_packages
  FOR SELECT TO anon, authenticated
  USING (is_active OR public.has_any_admin_role(auth.uid()));

DROP POLICY IF EXISTS "coin_packages_admin_write" ON public.coin_packages;
CREATE POLICY "coin_packages_admin_write" ON public.coin_packages
  FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

DROP TRIGGER IF EXISTS trg_coin_packages_updated ON public.coin_packages;
CREATE TRIGGER trg_coin_packages_updated
  BEFORE UPDATE ON public.coin_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Payment method currency
ALTER TABLE public.payment_methods
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'USD'
    CHECK (currency IN ('USD','EGP'));

UPDATE public.payment_methods SET currency = 'EGP'
 WHERE code IN ('vodafone_cash','instapay') AND currency = 'USD';

-- 4) Global currency setting
INSERT INTO public.site_settings(key, value)
VALUES ('currency', jsonb_build_object('egp_per_usd', 50))
ON CONFLICT (key) DO NOTHING;

-- 5) Seed default coin packages (only if empty)
INSERT INTO public.coin_packages(code, coins, bonus_coins, price_usd_cents, price_egp_cents, is_popular, sort_order)
SELECT * FROM (VALUES
  ('starter',    100,    0,   99,   5000, false, 1),
  ('bronze',     500,   25,  449,  22500, false, 2),
  ('silver',    1200,  100,  999,  50000, true,  3),
  ('gold',      3000,  400, 2299, 115000, false, 4),
  ('diamond',   6500, 1000, 4999, 250000, false, 5)
) AS v(code, coins, bonus_coins, price_usd_cents, price_egp_cents, is_popular, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.coin_packages);
