
-- ============ CHAPTER LOCKING & COIN ECONOMY ============
ALTER TABLE public.chapters ADD COLUMN IF NOT EXISTS coin_price integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.chapter_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  coins_spent integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id)
);
GRANT SELECT, INSERT ON public.chapter_unlocks TO authenticated;
GRANT ALL ON public.chapter_unlocks TO service_role;
ALTER TABLE public.chapter_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own unlocks read" ON public.chapter_unlocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own unlocks deny direct insert" ON public.chapter_unlocks FOR INSERT TO authenticated WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.coin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('purchase','spend_unlock','spend_gift','earn_unlock','earn_gift','admin_adjust','refund')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  ref_novel_id uuid REFERENCES public.novels(id) ON DELETE SET NULL,
  ref_chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  counterparty_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coin_tx_user ON public.coin_transactions(user_id, created_at DESC);
GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;
ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx read" ON public.coin_transactions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.coin_gifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid REFERENCES public.novels(id) ON DELETE SET NULL,
  amount integer NOT NULL CHECK (amount > 0),
  message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gifts_author ON public.coin_gifts(author_id, created_at DESC);
GRANT SELECT ON public.coin_gifts TO authenticated;
GRANT ALL ON public.coin_gifts TO service_role;
ALTER TABLE public.coin_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gifts read own" ON public.coin_gifts FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = author_id);

CREATE TABLE IF NOT EXISTS public.author_earnings (
  author_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  coins_total integer NOT NULL DEFAULT 0,
  coins_pending integer NOT NULL DEFAULT 0,
  coins_paid_out integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.author_earnings TO authenticated;
GRANT ALL ON public.author_earnings TO service_role;
ALTER TABLE public.author_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "author earnings self" ON public.author_earnings FOR SELECT TO authenticated
  USING (auth.uid() = author_id OR public.has_any_admin_role(auth.uid()));

-- ============ RPCs ============
CREATE OR REPLACE FUNCTION public.unlock_chapter(_chapter_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _price int;
  _novel_id uuid;
  _author uuid;
  _is_vip boolean;
  _balance int;
  _author_share int;
  _already boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT c.coin_price, c.novel_id, c.is_vip, n.owner_id INTO _price, _novel_id, _is_vip, _author
    FROM public.chapters c JOIN public.novels n ON n.id = c.novel_id
    WHERE c.id = _chapter_id;
  IF _price IS NULL THEN RAISE EXCEPTION 'chapter not found'; END IF;
  IF _price <= 0 AND NOT _is_vip THEN RAISE EXCEPTION 'chapter is free'; END IF;
  SELECT EXISTS(SELECT 1 FROM public.chapter_unlocks WHERE user_id=_uid AND chapter_id=_chapter_id) INTO _already;
  IF _already THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT coins INTO _balance FROM public.wallets WHERE user_id=_uid FOR UPDATE;
  IF _balance < _price THEN RAISE EXCEPTION 'insufficient coins'; END IF;

  UPDATE public.wallets SET coins = coins - _price, updated_at=now() WHERE user_id=_uid RETURNING coins INTO _balance;
  INSERT INTO public.chapter_unlocks(user_id, chapter_id, novel_id, coins_spent)
    VALUES (_uid, _chapter_id, _novel_id, _price);
  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, ref_novel_id, ref_chapter_id, counterparty_id)
    VALUES (_uid, 'spend_unlock', -_price, _balance, _novel_id, _chapter_id, _author);

  IF _author IS NOT NULL AND _author <> _uid THEN
    _author_share := (_price * 80) / 100;
    INSERT INTO public.author_earnings(author_id, coins_total, coins_pending)
      VALUES (_author, _author_share, _author_share)
      ON CONFLICT (author_id) DO UPDATE SET
        coins_total = author_earnings.coins_total + EXCLUDED.coins_total,
        coins_pending = author_earnings.coins_pending + EXCLUDED.coins_pending,
        updated_at = now();
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, ref_novel_id, ref_chapter_id, counterparty_id)
      VALUES (_author, 'earn_unlock', _author_share, 0, _novel_id, _chapter_id, _uid);
  END IF;
  RETURN jsonb_build_object('ok', true, 'balance', _balance);
END $$;
REVOKE EXECUTE ON FUNCTION public.unlock_chapter(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.unlock_chapter(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.gift_coins(_author_id uuid, _amount int, _novel_id uuid DEFAULT NULL, _message text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _balance int;
  _share int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _amount < 1 THEN RAISE EXCEPTION 'amount must be positive'; END IF;
  IF _author_id = _uid THEN RAISE EXCEPTION 'cannot gift to self'; END IF;
  INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT coins INTO _balance FROM public.wallets WHERE user_id=_uid FOR UPDATE;
  IF _balance < _amount THEN RAISE EXCEPTION 'insufficient coins'; END IF;
  UPDATE public.wallets SET coins = coins - _amount, updated_at=now() WHERE user_id=_uid RETURNING coins INTO _balance;
  INSERT INTO public.coin_gifts(sender_id, author_id, novel_id, amount, message)
    VALUES (_uid, _author_id, _novel_id, _amount, _message);
  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, ref_novel_id, counterparty_id, note)
    VALUES (_uid, 'spend_gift', -_amount, _balance, _novel_id, _author_id, _message);

  _share := (_amount * 90) / 100;
  INSERT INTO public.author_earnings(author_id, coins_total, coins_pending)
    VALUES (_author_id, _share, _share)
    ON CONFLICT (author_id) DO UPDATE SET
      coins_total = author_earnings.coins_total + EXCLUDED.coins_total,
      coins_pending = author_earnings.coins_pending + EXCLUDED.coins_pending,
      updated_at = now();
  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, ref_novel_id, counterparty_id)
    VALUES (_author_id, 'earn_gift', _share, 0, _novel_id, _uid);
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_author_id, 'gift', 'هدية جديدة', _amount || ' عملة', '/author');
  RETURN jsonb_build_object('ok', true, 'balance', _balance);
END $$;
REVOKE EXECUTE ON FUNCTION public.gift_coins(uuid,int,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gift_coins(uuid,int,uuid,text) TO authenticated;

-- ============ READING STREAKS & GOALS ============
CREATE TABLE IF NOT EXISTS public.reading_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_read_date date,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reading_streaks TO authenticated;
GRANT ALL ON public.reading_streaks TO service_role;
ALTER TABLE public.reading_streaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "streak own" ON public.reading_streaks FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.reading_goals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_chapters int NOT NULL DEFAULT 1,
  weekly_chapters int NOT NULL DEFAULT 7,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reading_goals TO authenticated;
GRANT ALL ON public.reading_goals TO service_role;
ALTER TABLE public.reading_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals own" ON public.reading_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.bump_reading_streak()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _last date;
  _cur int := 0;
  _long int := 0;
  _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
  SELECT last_read_date, current_streak, longest_streak INTO _last, _cur, _long
    FROM public.reading_streaks WHERE user_id=_uid;
  IF _last IS NULL THEN
    _cur := 1;
  ELSIF _last = _today THEN
    RETURN jsonb_build_object('ok',true,'current',_cur,'longest',_long,'unchanged',true);
  ELSIF _last = _today - 1 THEN
    _cur := _cur + 1;
  ELSE
    _cur := 1;
  END IF;
  IF _cur > _long THEN _long := _cur; END IF;
  INSERT INTO public.reading_streaks(user_id, current_streak, longest_streak, last_read_date)
    VALUES (_uid, _cur, _long, _today)
    ON CONFLICT (user_id) DO UPDATE SET
      current_streak = EXCLUDED.current_streak,
      longest_streak = EXCLUDED.longest_streak,
      last_read_date = EXCLUDED.last_read_date,
      updated_at = now();
  RETURN jsonb_build_object('ok',true,'current',_cur,'longest',_long);
END $$;
REVOKE EXECUTE ON FUNCTION public.bump_reading_streak() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bump_reading_streak() TO authenticated;

-- ============ CMS: HOMEPAGE BUILDER, STATIC PAGES, FAQ, ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS public.homepage_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sort_order int NOT NULL DEFAULT 0,
  title text NOT NULL,
  subtitle text,
  icon text,
  algorithm text NOT NULL DEFAULT 'latest'
    CHECK (algorithm IN ('latest','popular','top_rated','completed','ongoing','trending','upcoming','random','genre')),
  genre_slug text,
  limit_count int NOT NULL DEFAULT 12,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.homepage_sections TO anon, authenticated;
GRANT ALL ON public.homepage_sections TO service_role;
ALTER TABLE public.homepage_sections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sections read enabled" ON public.homepage_sections FOR SELECT TO anon, authenticated USING (enabled OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "sections admin write" ON public.homepage_sections FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.static_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  is_published boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.static_pages TO anon, authenticated;
GRANT ALL ON public.static_pages TO service_role;
ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pages read published" ON public.static_pages FOR SELECT TO anon, authenticated USING (is_published OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "pages admin write" ON public.static_pages FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.faqs TO anon, authenticated;
GRANT ALL ON public.faqs TO service_role;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "faqs read" ON public.faqs FOR SELECT TO anon, authenticated USING (enabled OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "faqs admin write" ON public.faqs FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'banner' CHECK (kind IN ('banner','popup','homepage')),
  title text NOT NULL,
  body text,
  link_url text,
  starts_at timestamptz,
  ends_at timestamptz,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ann read active" ON public.announcements FOR SELECT TO anon, authenticated USING (
  enabled AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())
  OR public.has_any_admin_role(auth.uid())
);
CREATE POLICY "ann admin write" ON public.announcements FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- ============ AD PLACEMENTS EXTENSION ============
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'html' CHECK (kind IN ('adsense','html','image','native'));
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS link_url text;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS starts_at timestamptz;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS ends_at timestamptz;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS priority int NOT NULL DEFAULT 0;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS frequency int NOT NULL DEFAULT 100;
ALTER TABLE public.ad_placements ADD COLUMN IF NOT EXISTS target jsonb NOT NULL DEFAULT '{}'::jsonb;
