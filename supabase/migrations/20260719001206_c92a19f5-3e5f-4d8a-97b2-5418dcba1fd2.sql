
-- ============================================================
-- PHASE 4: ECONOMY, MARKETPLACE & VIP SYSTEM
-- ============================================================

-- ---------- Categories ----------
CREATE TABLE IF NOT EXISTS public.marketplace_categories (
  code text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text,
  icon text,
  sort_order int NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  vip_only boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.marketplace_categories TO anon, authenticated;
GRANT ALL ON public.marketplace_categories TO service_role;
ALTER TABLE public.marketplace_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "mk_cat_read" ON public.marketplace_categories;
CREATE POLICY "mk_cat_read" ON public.marketplace_categories FOR SELECT USING (enabled);

INSERT INTO public.marketplace_categories(code,label_ar,label_en,icon,sort_order) VALUES
  ('frame','إطار الملف','Profile Frame','🖼️',10),
  ('animated_frame','إطار متحرك','Animated Frame','✨',20),
  ('theme','ثيم الملف','Profile Theme','🎨',30),
  ('background','خلفية الملف','Profile Background','🌌',40),
  ('chat_color','لون الدردشة','Chat Color','💬',50),
  ('username_color','لون الاسم','Username Color','🅰️',60),
  ('badge','شارة حصرية','Exclusive Badge','🏅',70),
  ('title','لقب','Title','👑',80),
  ('effect','تأثير قراءة','Reading Effect','📖',90),
  ('box','صندوق غامض','Mystery Box','🎁',100),
  ('vip','عضوية VIP','VIP Membership','💎',110)
ON CONFLICT (code) DO NOTHING;

-- ---------- Catalogs ----------
CREATE TABLE IF NOT EXISTS public.titles_catalog (
  code text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text,
  rarity text NOT NULL DEFAULT 'common',
  color text,
  vip_only boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.titles_catalog TO anon, authenticated;
GRANT ALL ON public.titles_catalog TO service_role;
ALTER TABLE public.titles_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "titles_read" ON public.titles_catalog FOR SELECT USING (enabled);

CREATE TABLE IF NOT EXISTS public.frames_catalog (
  code text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text,
  kind text NOT NULL DEFAULT 'static', -- static|animated|seasonal|vip|achievement
  image_url text,
  animation_url text,
  rarity text NOT NULL DEFAULT 'common',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.frames_catalog TO anon, authenticated;
GRANT ALL ON public.frames_catalog TO service_role;
ALTER TABLE public.frames_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "frames_read" ON public.frames_catalog FOR SELECT USING (enabled);

CREATE TABLE IF NOT EXISTS public.themes_catalog (
  code text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text,
  preview_url text,
  css jsonb NOT NULL DEFAULT '{}'::jsonb,
  rarity text NOT NULL DEFAULT 'common',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.themes_catalog TO anon, authenticated;
GRANT ALL ON public.themes_catalog TO service_role;
ALTER TABLE public.themes_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "themes_read" ON public.themes_catalog FOR SELECT USING (enabled);

CREATE TABLE IF NOT EXISTS public.reading_effects_catalog (
  code text PRIMARY KEY,
  label_ar text NOT NULL,
  label_en text,
  css jsonb NOT NULL DEFAULT '{}'::jsonb,
  rarity text NOT NULL DEFAULT 'common',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reading_effects_catalog TO anon, authenticated;
GRANT ALL ON public.reading_effects_catalog TO service_role;
ALTER TABLE public.reading_effects_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "effects_read" ON public.reading_effects_catalog FOR SELECT USING (enabled);

-- Seed default titles/frames/themes/effects
INSERT INTO public.titles_catalog(code,label_ar,label_en,rarity,color) VALUES
  ('new_reader','قارئ جديد','New Reader','common','#94a3b8'),
  ('book_hunter','صيّاد الكتب','Book Hunter','rare','#38bdf8'),
  ('elite_reader','قارئ نخبة','Elite Reader','epic','#e879f9'),
  ('night_owl','بومة الليل','Night Owl','rare','#818cf8'),
  ('legend','أسطورة','Legend','legendary','#fbbf24'),
  ('immortal_reader','قارئ خالد','Immortal Reader','legendary','#fb7185'),
  ('verified_author','كاتب موثّق','Verified Author','epic','#22d3ee'),
  ('vip_member','عضو VIP','VIP','legendary','#f97316'),
  ('champion','بطل','Champion','epic','#facc15')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.themes_catalog(code,label_ar,label_en,rarity,css) VALUES
  ('dark','داكن','Dark','common','{"bg":"#0a0a0a","accent":"#f97316"}'),
  ('orange','برتقالي','Orange','common','{"bg":"#1a0f00","accent":"#fb923c"}'),
  ('galaxy','مجرّي','Galaxy','epic','{"bg":"#0b0b2a","accent":"#a78bfa"}'),
  ('fire','ناري','Fire','rare','{"bg":"#1a0505","accent":"#ef4444"}'),
  ('ocean','محيطي','Ocean','rare','{"bg":"#001222","accent":"#22d3ee"}'),
  ('golden','ذهبي','Golden','legendary','{"bg":"#1a1200","accent":"#fbbf24"}'),
  ('cyber','سايبر','Cyber','legendary','{"bg":"#001a1a","accent":"#22ffcc"}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.reading_effects_catalog(code,label_ar,label_en,rarity,css) VALUES
  ('none','بدون','None','common','{}'),
  ('sparkle','بريق','Sparkle','rare','{"effect":"sparkle"}'),
  ('flame','لهب','Flame','epic','{"effect":"flame"}'),
  ('aurora','شفق','Aurora','legendary','{"effect":"aurora"}')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.frames_catalog(code,label_ar,label_en,kind,rarity) VALUES
  ('classic','كلاسيكي','Classic','static','common'),
  ('gold_ring','حلقة ذهبية','Gold Ring','static','rare'),
  ('neon_pulse','نيون نابض','Neon Pulse','animated','epic'),
  ('vip_crown','تاج VIP','VIP Crown','vip','legendary'),
  ('winter_2026','شتاء 2026','Winter 2026','seasonal','rare')
ON CONFLICT (code) DO NOTHING;

-- ---------- Marketplace Items ----------
CREATE TABLE IF NOT EXISTS public.marketplace_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL REFERENCES public.marketplace_categories(code) ON DELETE RESTRICT,
  code text UNIQUE NOT NULL,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  icon text,
  image_url text,
  animation_url text,
  rarity text NOT NULL DEFAULT 'common', -- common|rare|epic|legendary
  price_coins int NOT NULL DEFAULT 0 CHECK (price_coins >= 0),
  original_price_coins int,
  duration_days int, -- null = permanent
  vip_only boolean NOT NULL DEFAULT false,
  stock int, -- null = unlimited
  stock_sold int NOT NULL DEFAULT 0,
  max_per_user int, -- null = unlimited per user
  is_active boolean NOT NULL DEFAULT true,
  starts_at timestamptz,
  ends_at timestamptz,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb, -- {frame_code,title_code,theme_code,badge_code,effect_code,vip_days,box_pool_key}
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mk_items_active ON public.marketplace_items(is_active, category, sort_order);
GRANT SELECT ON public.marketplace_items TO anon, authenticated;
GRANT ALL ON public.marketplace_items TO service_role;
ALTER TABLE public.marketplace_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "mk_items_read" ON public.marketplace_items FOR SELECT
  USING (is_active AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));

-- ---------- Inventory ----------
CREATE TABLE IF NOT EXISTS public.user_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  item_code text, -- references frames/titles/themes/effects/badges catalog code OR item.code
  marketplace_item_id uuid REFERENCES public.marketplace_items(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'purchase', -- purchase|admin|event|box|referral|achievement
  acquired_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  is_equipped boolean NOT NULL DEFAULT false,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_inv_user ON public.user_inventory(user_id, category);
CREATE INDEX IF NOT EXISTS idx_inv_expiry ON public.user_inventory(expires_at) WHERE expires_at IS NOT NULL;
GRANT SELECT ON public.user_inventory TO authenticated;
GRANT ALL ON public.user_inventory TO service_role;
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inv_owner_read" ON public.user_inventory FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---------- Equipment ----------
CREATE TABLE IF NOT EXISTS public.user_equipment (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot text NOT NULL, -- frame|theme|title|badge|chat_color|background|effect|username_color
  inventory_id uuid REFERENCES public.user_inventory(id) ON DELETE SET NULL,
  item_code text,
  equipped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, slot)
);
GRANT SELECT ON public.user_equipment TO authenticated;
GRANT ALL ON public.user_equipment TO service_role;
ALTER TABLE public.user_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "eq_owner_read" ON public.user_equipment FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- Public read of equipped cosmetics (so other users see the frame/title on profiles)
CREATE POLICY "eq_public_read" ON public.user_equipment FOR SELECT TO anon, authenticated USING (true);

-- ---------- Purchases (immutable ledger) ----------
CREATE TABLE IF NOT EXISTS public.marketplace_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  item_id uuid REFERENCES public.marketplace_items(id) ON DELETE SET NULL,
  category text NOT NULL,
  price_coins int NOT NULL,
  qty int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'completed', -- completed|refunded
  refunded_at timestamptz,
  inventory_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purch_user ON public.marketplace_purchases(user_id, created_at DESC);
GRANT SELECT ON public.marketplace_purchases TO authenticated;
GRANT ALL ON public.marketplace_purchases TO service_role;
ALTER TABLE public.marketplace_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "purch_owner_read" ON public.marketplace_purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- ---------- Daily Shop ----------
CREATE TABLE IF NOT EXISTS public.daily_shop (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL,
  item_id uuid NOT NULL REFERENCES public.marketplace_items(id) ON DELETE CASCADE,
  discount_percent int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(day, item_id)
);
CREATE INDEX IF NOT EXISTS idx_daily_shop_day ON public.daily_shop(day);
GRANT SELECT ON public.daily_shop TO anon, authenticated;
GRANT ALL ON public.daily_shop TO service_role;
ALTER TABLE public.daily_shop ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shop_read" ON public.daily_shop FOR SELECT USING (day = current_date);

-- ============================================================
-- RPCs
-- ============================================================

-- Atomic purchase
CREATE OR REPLACE FUNCTION public.mk_buy_item(_item_id uuid, _qty int DEFAULT 1)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _item public.marketplace_items%ROWTYPE;
  _price int;
  _bal int;
  _inv_id uuid;
  _existing int;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','unauthorized'); END IF;
  IF _qty IS NULL OR _qty < 1 THEN _qty := 1; END IF;

  SELECT * INTO _item FROM public.marketplace_items WHERE id = _item_id FOR UPDATE;
  IF NOT FOUND OR NOT _item.is_active THEN
    RETURN jsonb_build_object('ok',false,'error','not_available');
  END IF;
  IF _item.starts_at IS NOT NULL AND _item.starts_at > now() THEN
    RETURN jsonb_build_object('ok',false,'error','not_started');
  END IF;
  IF _item.ends_at IS NOT NULL AND _item.ends_at <= now() THEN
    RETURN jsonb_build_object('ok',false,'error','expired');
  END IF;
  IF _item.stock IS NOT NULL AND _item.stock_sold + _qty > _item.stock THEN
    RETURN jsonb_build_object('ok',false,'error','out_of_stock');
  END IF;
  IF _item.vip_only AND NOT COALESCE((SELECT is_vip FROM public.profiles WHERE id = _uid),false) THEN
    RETURN jsonb_build_object('ok',false,'error','vip_only');
  END IF;
  IF _item.max_per_user IS NOT NULL THEN
    SELECT COALESCE(SUM(qty),0) INTO _existing FROM public.marketplace_purchases
      WHERE user_id = _uid AND item_id = _item_id AND status = 'completed';
    IF _existing + _qty > _item.max_per_user THEN
      RETURN jsonb_build_object('ok',false,'error','limit_reached');
    END IF;
  END IF;

  _price := _item.price_coins * _qty;

  -- Lock wallet
  SELECT coins INTO _bal FROM public.wallets WHERE user_id = _uid FOR UPDATE;
  IF _bal IS NULL THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0);
    _bal := 0;
  END IF;
  IF _bal < _price THEN
    RETURN jsonb_build_object('ok',false,'error','insufficient_coins','balance',_bal,'price',_price);
  END IF;

  UPDATE public.wallets SET coins = coins - _price WHERE user_id = _uid;
  INSERT INTO public.coin_transactions(user_id,kind,amount,balance_after,note)
    VALUES (_uid,'marketplace_spend',-_price,_bal - _price, _item.title_ar);

  UPDATE public.marketplace_items SET stock_sold = stock_sold + _qty WHERE id = _item_id;

  -- VIP purchase
  IF _item.category = 'vip' THEN
    DECLARE _days int := COALESCE((_item.payload->>'vip_days')::int, _item.duration_days, 0);
    BEGIN
      IF _days > 0 OR (_item.payload->>'lifetime')::boolean THEN
        UPDATE public.profiles SET is_vip = true,
          vip_expires_at = CASE
            WHEN (_item.payload->>'lifetime')::boolean THEN NULL
            WHEN vip_expires_at IS NULL OR vip_expires_at < now() THEN now() + make_interval(days => _days)
            ELSE vip_expires_at + make_interval(days => _days) END
          WHERE id = _uid;
        INSERT INTO public.vip_subscriptions(user_id, plan_code, starts_at, ends_at, status, source)
          VALUES (_uid, _item.code, now(),
            CASE WHEN (_item.payload->>'lifetime')::boolean THEN NULL ELSE now() + make_interval(days => _days) END,
            'active', 'coins')
          ON CONFLICT DO NOTHING;
      END IF;
    END;
  ELSIF _item.category = 'box' THEN
    -- Give N reward boxes
    INSERT INTO public.reward_boxes(user_id, source, reward)
      SELECT _uid, 'marketplace', '{}'::jsonb FROM generate_series(1,_qty);
  ELSE
    -- Grant inventory entry(ies)
    FOR i IN 1.._qty LOOP
      INSERT INTO public.user_inventory(user_id,category,item_code,marketplace_item_id,source,expires_at,meta)
        VALUES (_uid,_item.category,_item.code,_item.id,'purchase',
          CASE WHEN _item.duration_days IS NOT NULL THEN now() + make_interval(days => _item.duration_days) ELSE NULL END,
          _item.payload)
        RETURNING id INTO _inv_id;
    END LOOP;
  END IF;

  INSERT INTO public.marketplace_purchases(user_id,item_id,category,price_coins,qty,inventory_id)
    VALUES (_uid,_item.id,_item.category,_price,_qty,_inv_id);

  -- Notification
  INSERT INTO public.notifications(user_id,kind,title,body,ref_url)
    VALUES (_uid,'marketplace_purchase',
      'اكتمل الشراء',
      'حصلت على '||_item.title_ar,
      '/inventory')
    ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object('ok',true,'balance',_bal - _price,'inventory_id',_inv_id);
END $$;
REVOKE ALL ON FUNCTION public.mk_buy_item(uuid,int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_buy_item(uuid,int) TO authenticated;

-- Equip / unequip
CREATE OR REPLACE FUNCTION public.mk_equip(_inventory_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _inv public.user_inventory%ROWTYPE; _slot text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok',false,'error','unauthorized'); END IF;
  SELECT * INTO _inv FROM public.user_inventory WHERE id = _inventory_id AND user_id = _uid;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_owned'); END IF;
  IF _inv.expires_at IS NOT NULL AND _inv.expires_at < now() THEN
    RETURN jsonb_build_object('ok',false,'error','expired'); END IF;
  _slot := CASE _inv.category
    WHEN 'animated_frame' THEN 'frame'
    ELSE _inv.category END;
  UPDATE public.user_inventory SET is_equipped = false WHERE user_id = _uid AND category IN (_slot, _inv.category) AND id <> _inventory_id;
  UPDATE public.user_inventory SET is_equipped = true WHERE id = _inventory_id;
  INSERT INTO public.user_equipment(user_id,slot,inventory_id,item_code,equipped_at)
    VALUES (_uid,_slot,_inventory_id,_inv.item_code,now())
    ON CONFLICT (user_id,slot) DO UPDATE SET inventory_id = EXCLUDED.inventory_id, item_code = EXCLUDED.item_code, equipped_at = now();
  RETURN jsonb_build_object('ok',true,'slot',_slot);
END $$;
REVOKE ALL ON FUNCTION public.mk_equip(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_equip(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.mk_unequip(_slot text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok',false); END IF;
  UPDATE public.user_inventory SET is_equipped = false
    WHERE user_id = _uid AND id = (SELECT inventory_id FROM public.user_equipment WHERE user_id=_uid AND slot=_slot);
  DELETE FROM public.user_equipment WHERE user_id = _uid AND slot = _slot;
  RETURN jsonb_build_object('ok',true);
END $$;
REVOKE ALL ON FUNCTION public.mk_unequip(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_unequip(text) TO authenticated;

-- Inventory & equipment readers
CREATE OR REPLACE FUNCTION public.mk_my_inventory()
RETURNS TABLE(
  id uuid, category text, item_code text, marketplace_item_id uuid,
  source text, acquired_at timestamptz, expires_at timestamptz, is_equipped boolean,
  title_ar text, title_en text, rarity text, icon text, image_url text, meta jsonb
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT inv.id, inv.category, inv.item_code, inv.marketplace_item_id,
         inv.source, inv.acquired_at, inv.expires_at, inv.is_equipped,
         COALESCE(mi.title_ar, inv.item_code) AS title_ar,
         mi.title_en, COALESCE(mi.rarity,'common') AS rarity,
         mi.icon, mi.image_url, inv.meta
  FROM public.user_inventory inv
  LEFT JOIN public.marketplace_items mi ON mi.id = inv.marketplace_item_id
  WHERE inv.user_id = auth.uid()
    AND (inv.expires_at IS NULL OR inv.expires_at > now())
  ORDER BY inv.acquired_at DESC;
$$;
REVOKE ALL ON FUNCTION public.mk_my_inventory() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_my_inventory() TO authenticated;

CREATE OR REPLACE FUNCTION public.mk_my_equipment()
RETURNS TABLE(slot text, inventory_id uuid, item_code text, equipped_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT slot, inventory_id, item_code, equipped_at FROM public.user_equipment WHERE user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.mk_my_equipment() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_my_equipment() TO authenticated;

-- Daily shop
CREATE OR REPLACE FUNCTION public.mk_rotate_daily_shop(_count int DEFAULT 6)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int; _uid uuid := auth.uid();
BEGIN
  IF _uid IS NOT NULL AND NOT public.has_any_admin_role(_uid) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  DELETE FROM public.daily_shop WHERE day = current_date;
  INSERT INTO public.daily_shop(day,item_id,discount_percent,sort_order)
  SELECT current_date, id,
    CASE rarity WHEN 'legendary' THEN 0 WHEN 'epic' THEN 5 WHEN 'rare' THEN 10 ELSE 15 END,
    row_number() OVER ()
  FROM public.marketplace_items
  WHERE is_active
    AND category NOT IN ('vip')
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  ORDER BY random()
  LIMIT _count;
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.mk_rotate_daily_shop(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_rotate_daily_shop(int) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mk_daily_shop()
RETURNS TABLE(
  item_id uuid, code text, category text, title_ar text, title_en text,
  icon text, image_url text, rarity text, price_coins int, discount_percent int, ends_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.daily_shop WHERE day = current_date) THEN
    PERFORM public.mk_rotate_daily_shop(6);
  END IF;
  RETURN QUERY
  SELECT mi.id, mi.code, mi.category, mi.title_ar, mi.title_en,
    mi.icon, mi.image_url, mi.rarity, mi.price_coins, ds.discount_percent,
    (current_date + interval '1 day')::timestamptz
  FROM public.daily_shop ds
  JOIN public.marketplace_items mi ON mi.id = ds.item_id
  WHERE ds.day = current_date
  ORDER BY ds.sort_order;
END $$;
REVOKE ALL ON FUNCTION public.mk_daily_shop() FROM public;
GRANT EXECUTE ON FUNCTION public.mk_daily_shop() TO anon, authenticated;

-- Purchase history
CREATE OR REPLACE FUNCTION public.mk_purchase_history(_limit int DEFAULT 30, _before timestamptz DEFAULT NULL)
RETURNS TABLE(
  id uuid, item_id uuid, title_ar text, category text, price_coins int, qty int,
  status text, created_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p.id, p.item_id, COALESCE(mi.title_ar,''), p.category, p.price_coins, p.qty, p.status, p.created_at
  FROM public.marketplace_purchases p
  LEFT JOIN public.marketplace_items mi ON mi.id = p.item_id
  WHERE p.user_id = auth.uid()
    AND (_before IS NULL OR p.created_at < _before)
  ORDER BY p.created_at DESC
  LIMIT LEAST(_limit,100);
$$;
REVOKE ALL ON FUNCTION public.mk_purchase_history(int, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_purchase_history(int, timestamptz) TO authenticated;

-- Coin transactions history
CREATE OR REPLACE FUNCTION public.mk_coin_history(_limit int DEFAULT 50, _before timestamptz DEFAULT NULL)
RETURNS TABLE(id uuid, kind text, amount int, balance_after int, note text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, kind, amount, balance_after, note, created_at
  FROM public.coin_transactions
  WHERE user_id = auth.uid()
    AND (_before IS NULL OR created_at < _before)
  ORDER BY created_at DESC
  LIMIT LEAST(_limit,200);
$$;
REVOKE ALL ON FUNCTION public.mk_coin_history(int, timestamptz) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_coin_history(int, timestamptz) TO authenticated;

-- Admin: grant item / VIP
CREATE OR REPLACE FUNCTION public.mk_admin_grant_item(_user uuid, _item_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _item public.marketplace_items%ROWTYPE; _inv_id uuid;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _item FROM public.marketplace_items WHERE id = _item_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','not_found'); END IF;
  INSERT INTO public.user_inventory(user_id,category,item_code,marketplace_item_id,source,expires_at,meta)
    VALUES (_user,_item.category,_item.code,_item.id,'admin',
      CASE WHEN _item.duration_days IS NOT NULL THEN now() + make_interval(days => _item.duration_days) ELSE NULL END,
      _item.payload)
    RETURNING id INTO _inv_id;
  INSERT INTO public.notifications(user_id,kind,title,body)
    VALUES (_user,'admin_gift','هدية من الإدارة','حصلت على '||_item.title_ar);
  RETURN jsonb_build_object('ok',true,'inventory_id',_inv_id);
END $$;
REVOKE ALL ON FUNCTION public.mk_admin_grant_item(uuid,uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_admin_grant_item(uuid,uuid) TO authenticated;

-- Economy dashboard
CREATE OR REPLACE FUNCTION public.mk_economy_dashboard(_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _r jsonb;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'total_generated', COALESCE((SELECT SUM(amount) FROM public.coin_transactions WHERE amount > 0),0),
    'total_spent', COALESCE((SELECT -SUM(amount) FROM public.coin_transactions WHERE amount < 0),0),
    'avg_user_coins', COALESCE((SELECT AVG(coins)::int FROM public.wallets),0),
    'top_buyers', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT user_id, SUM(price_coins) AS spent, COUNT(*) AS purchases
        FROM public.marketplace_purchases
        WHERE created_at > now() - make_interval(days => _days)
        GROUP BY user_id ORDER BY spent DESC LIMIT 10
      ) t
    ), '[]'::jsonb),
    'top_earners', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT user_id, SUM(amount) AS earned
        FROM public.coin_transactions
        WHERE amount > 0 AND created_at > now() - make_interval(days => _days)
        GROUP BY user_id ORDER BY earned DESC LIMIT 10
      ) t
    ), '[]'::jsonb),
    'most_purchased', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT p.item_id, mi.title_ar, COUNT(*) AS purchases, SUM(p.price_coins) AS revenue
        FROM public.marketplace_purchases p
        LEFT JOIN public.marketplace_items mi ON mi.id = p.item_id
        WHERE p.created_at > now() - make_interval(days => _days)
        GROUP BY p.item_id, mi.title_ar ORDER BY purchases DESC LIMIT 10
      ) t
    ), '[]'::jsonb),
    'most_equipped', COALESCE((
      SELECT jsonb_agg(t) FROM (
        SELECT item_code, slot, COUNT(*) AS n
        FROM public.user_equipment
        WHERE item_code IS NOT NULL GROUP BY item_code, slot ORDER BY n DESC LIMIT 10
      ) t
    ), '[]'::jsonb),
    'daily_flow', COALESCE((
      SELECT jsonb_agg(t ORDER BY day) FROM (
        SELECT date_trunc('day', created_at)::date AS day,
          SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS earned,
          -SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END) AS spent
        FROM public.coin_transactions
        WHERE created_at > now() - make_interval(days => _days)
        GROUP BY 1
      ) t
    ), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.mk_economy_dashboard(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_economy_dashboard(int) TO authenticated;

-- Auto-cleanup expired items (called from expire trigger or cron)
CREATE OR REPLACE FUNCTION public.mk_expire_inventory()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _n int;
BEGIN
  UPDATE public.user_inventory SET is_equipped = false
    WHERE is_equipped = true AND expires_at IS NOT NULL AND expires_at < now();
  DELETE FROM public.user_equipment WHERE inventory_id IN
    (SELECT id FROM public.user_inventory WHERE expires_at IS NOT NULL AND expires_at < now());
  GET DIAGNOSTICS _n = ROW_COUNT;
  RETURN _n;
END $$;
REVOKE ALL ON FUNCTION public.mk_expire_inventory() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mk_expire_inventory() TO service_role;

-- Updated_at trigger for items
CREATE OR REPLACE FUNCTION public.mk_touch_updated() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_mk_items_touch ON public.marketplace_items;
CREATE TRIGGER trg_mk_items_touch BEFORE UPDATE ON public.marketplace_items
  FOR EACH ROW EXECUTE FUNCTION public.mk_touch_updated();
