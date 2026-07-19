
-- 7D.1 — Provider fields on withdrawal_requests (future Stripe/PayPal)
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS provider_ref text,
  ADD COLUMN IF NOT EXISTS fee_coins integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  ALTER TABLE public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_provider_check
    CHECK (provider IN ('manual','stripe','paypal','wise','crypto'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.withdrawal_requests
    ADD CONSTRAINT withdrawal_requests_fee_nonneg CHECK (fee_coins >= 0);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_author_created
  ON public.withdrawal_requests(author_id, created_at DESC);

-- 7D.2 — Support indexes for earnings aggregations
CREATE INDEX IF NOT EXISTS idx_coin_tx_earn_by_user_created
  ON public.coin_transactions(user_id, created_at DESC)
  WHERE kind IN ('earn_unlock','earn_gift');

CREATE INDEX IF NOT EXISTS idx_coin_tx_earn_by_user_novel
  ON public.coin_transactions(user_id, ref_novel_id)
  WHERE kind IN ('earn_unlock','earn_gift') AND ref_novel_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coin_tx_earn_by_user_chapter
  ON public.coin_transactions(user_id, ref_chapter_id)
  WHERE kind IN ('earn_unlock','earn_gift') AND ref_chapter_id IS NOT NULL;

-- 7D.3 — Revenue summary
CREATE OR REPLACE FUNCTION public.author_revenue_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _e   public.author_earnings%ROWTYPE;
  _month int;
  _last30 int;
  _in_flight int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT * INTO _e FROM public.author_earnings WHERE author_id = _uid;

  SELECT COALESCE(SUM(amount),0) INTO _month
  FROM public.coin_transactions
  WHERE user_id = _uid
    AND kind IN ('earn_unlock','earn_gift')
    AND created_at >= date_trunc('month', now());

  SELECT COALESCE(SUM(amount),0) INTO _last30
  FROM public.coin_transactions
  WHERE user_id = _uid
    AND kind IN ('earn_unlock','earn_gift')
    AND created_at >= now() - interval '30 days';

  SELECT COALESCE(SUM(coins),0) INTO _in_flight
  FROM public.withdrawal_requests
  WHERE author_id = _uid AND status = 'pending';

  RETURN jsonb_build_object(
    'lifetime',    COALESCE(_e.coins_total, 0),
    'available',   COALESCE(_e.coins_pending, 0),
    'paid_out',    COALESCE(_e.coins_paid_out, 0),
    'in_flight',   _in_flight,
    'this_month',  _month,
    'last_30d',    _last30
  );
END $$;

REVOKE ALL ON FUNCTION public.author_revenue_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_revenue_summary() TO authenticated;

-- 7D.4 — Time-series (daily/weekly/monthly)
CREATE OR REPLACE FUNCTION public.author_revenue_timeseries(_bucket text DEFAULT 'day', _days int DEFAULT 30)
RETURNS TABLE(bucket_start timestamptz, coins bigint, tip_coins bigint, unlock_coins bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _trunc text;
  _step  interval;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _days < 1 OR _days > 730 THEN _days := 30; END IF;
  IF _bucket NOT IN ('day','week','month') THEN _bucket := 'day'; END IF;
  _trunc := _bucket;
  _step  := ('1 ' || _bucket)::interval;

  RETURN QUERY
  WITH series AS (
    SELECT gs AS bucket_start
    FROM generate_series(
      date_trunc(_trunc, now() - (_days::text || ' days')::interval),
      date_trunc(_trunc, now()),
      _step
    ) AS gs
  ),
  tx AS (
    SELECT date_trunc(_trunc, created_at) AS b,
           kind,
           amount
    FROM public.coin_transactions
    WHERE user_id = _uid
      AND kind IN ('earn_unlock','earn_gift')
      AND created_at >= now() - (_days::text || ' days')::interval
  )
  SELECT s.bucket_start,
         COALESCE(SUM(tx.amount), 0)::bigint AS coins,
         COALESCE(SUM(CASE WHEN tx.kind='earn_gift'   THEN tx.amount END), 0)::bigint AS tip_coins,
         COALESCE(SUM(CASE WHEN tx.kind='earn_unlock' THEN tx.amount END), 0)::bigint AS unlock_coins
  FROM series s
  LEFT JOIN tx ON tx.b = s.bucket_start
  GROUP BY s.bucket_start
  ORDER BY s.bucket_start ASC;
END $$;

REVOKE ALL ON FUNCTION public.author_revenue_timeseries(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_revenue_timeseries(text, int) TO authenticated;

-- 7D.5 — Top novels by earnings
CREATE OR REPLACE FUNCTION public.author_top_novels(_limit int DEFAULT 5, _days int DEFAULT NULL)
RETURNS TABLE(novel_id uuid, title text, slug text, cover_url text, coins bigint, tip_coins bigint, unlock_coins bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _limit IS NULL OR _limit < 1 OR _limit > 50 THEN _limit := 5; END IF;

  RETURN QUERY
  SELECT n.id AS novel_id,
         n.title,
         n.slug,
         n.cover_url,
         COALESCE(SUM(t.amount),0)::bigint AS coins,
         COALESCE(SUM(CASE WHEN t.kind='earn_gift'   THEN t.amount END),0)::bigint AS tip_coins,
         COALESCE(SUM(CASE WHEN t.kind='earn_unlock' THEN t.amount END),0)::bigint AS unlock_coins
  FROM public.coin_transactions t
  JOIN public.novels n ON n.id = t.ref_novel_id
  WHERE t.user_id = _uid
    AND t.kind IN ('earn_unlock','earn_gift')
    AND (_days IS NULL OR t.created_at >= now() - (_days::text || ' days')::interval)
  GROUP BY n.id, n.title, n.slug, n.cover_url
  ORDER BY coins DESC
  LIMIT _limit;
END $$;

REVOKE ALL ON FUNCTION public.author_top_novels(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_top_novels(int, int) TO authenticated;

-- 7D.6 — Top chapters by earnings
CREATE OR REPLACE FUNCTION public.author_top_chapters(_limit int DEFAULT 5, _days int DEFAULT NULL)
RETURNS TABLE(chapter_id uuid, chapter_number int, title text, novel_id uuid, novel_slug text, novel_title text, coins bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _limit IS NULL OR _limit < 1 OR _limit > 50 THEN _limit := 5; END IF;

  RETURN QUERY
  SELECT c.id AS chapter_id,
         c.chapter_number,
         c.title,
         n.id AS novel_id,
         n.slug AS novel_slug,
         n.title AS novel_title,
         COALESCE(SUM(t.amount),0)::bigint AS coins
  FROM public.coin_transactions t
  JOIN public.chapters c ON c.id = t.ref_chapter_id
  JOIN public.novels   n ON n.id = c.novel_id
  WHERE t.user_id = _uid
    AND t.kind = 'earn_unlock'
    AND (_days IS NULL OR t.created_at >= now() - (_days::text || ' days')::interval)
  GROUP BY c.id, c.chapter_number, c.title, n.id, n.slug, n.title
  ORDER BY coins DESC
  LIMIT _limit;
END $$;

REVOKE ALL ON FUNCTION public.author_top_chapters(int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.author_top_chapters(int, int) TO authenticated;

-- 7D.7 — request_withdrawal: accept optional provider (default 'manual')
CREATE OR REPLACE FUNCTION public.request_withdrawal(
  _coins int,
  _method text,
  _account text,
  _provider text DEFAULT 'manual'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _pending int; _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _coins < 100 THEN RAISE EXCEPTION 'minimum 100 coins'; END IF;
  IF _provider NOT IN ('manual','stripe','paypal','wise','crypto') THEN
    RAISE EXCEPTION 'invalid provider';
  END IF;
  SELECT coins_pending INTO _pending FROM public.author_earnings WHERE author_id=_uid FOR UPDATE;
  IF _pending IS NULL OR _pending < _coins THEN RAISE EXCEPTION 'insufficient pending earnings'; END IF;
  UPDATE public.author_earnings SET coins_pending = coins_pending - _coins, updated_at=now() WHERE author_id=_uid;
  INSERT INTO public.withdrawal_requests(author_id, coins, method_code, payout_account, provider)
    VALUES (_uid, _coins, _method, _account, _provider) RETURNING id INTO _id;
  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.request_withdrawal(int, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(int, text, text, text) TO authenticated;
