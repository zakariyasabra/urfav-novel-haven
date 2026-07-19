
-- ============================================================
-- Phase 7 · Batch 7A: Foundations
-- ============================================================

-- 1. FEATURE FLAGS
CREATE OR REPLACE FUNCTION public.is_feature_enabled(_flag text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT (value->>'enabled')::boolean
       FROM public.site_settings
      WHERE key = 'feature_flag:' || _flag
      LIMIT 1),
    false
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_feature_enabled(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_feature_enabled(text) TO anon, authenticated, service_role;

INSERT INTO public.site_settings (key, value) VALUES
  ('feature_flag:battle_pass',        '{"enabled": false, "label": "Battle Pass"}'::jsonb),
  ('feature_flag:payments',           '{"enabled": false, "label": "Payments (new providers)"}'::jsonb),
  ('feature_flag:premium_chapters',   '{"enabled": true,  "label": "Premium Chapters"}'::jsonb),
  ('feature_flag:premium_rental',     '{"enabled": false, "label": "Chapter Rentals"}'::jsonb),
  ('feature_flag:premium_purchase',   '{"enabled": false, "label": "Chapter Purchase"}'::jsonb),
  ('feature_flag:reading_clubs',      '{"enabled": false, "label": "Reading Clubs"}'::jsonb),
  ('feature_flag:club_realtime_chat', '{"enabled": false, "label": "Club Realtime Chat"}'::jsonb),
  ('feature_flag:ai_features',        '{"enabled": true,  "label": "AI Assistant"}'::jsonb),
  ('feature_flag:recommendations_v2', '{"enabled": false, "label": "Recommendations V2"}'::jsonb),
  ('feature_flag:messaging',          '{"enabled": false, "label": "Private Messaging"}'::jsonb),
  ('feature_flag:creator_studio',     '{"enabled": false, "label": "Creator Studio"}'::jsonb),
  ('feature_flag:notification_center','{"enabled": true,  "label": "Notification Center"}'::jsonb),
  ('feature_flag:author_donations',   '{"enabled": false, "label": "Author Donations"}'::jsonb),
  ('feature_flag:global_search_v2',   '{"enabled": false, "label": "Global Search V2"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. PAYMENT PROVIDERS
CREATE TABLE IF NOT EXISTS public.payment_providers (
  code text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text,
  kind text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  is_live boolean NOT NULL DEFAULT false,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  supports_recurring boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_providers TO anon, authenticated;
GRANT ALL ON public.payment_providers TO service_role;
ALTER TABLE public.payment_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_providers_public_read_enabled"
  ON public.payment_providers FOR SELECT
  USING (enabled = true);

CREATE POLICY "payment_providers_admin_manage"
  ON public.payment_providers FOR ALL
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.payment_providers (code, name_ar, name_en, kind, supports_recurring, sort_order) VALUES
  ('stripe',     'سترايب',       'Stripe',      'card',   true,  10),
  ('paypal',     'باي بال',      'PayPal',      'wallet', true,  20),
  ('apple_pay',  'أبل باي',      'Apple Pay',   'wallet', false, 30),
  ('google_pay', 'جوجل باي',     'Google Pay',  'wallet', false, 40),
  ('stc_pay',    'STC Pay',      'STC Pay',     'wallet', false, 50),
  ('mada',       'مدى',          'Mada',        'card',   false, 60),
  ('crypto',     'عملات رقمية',  'Crypto',      'crypto', false, 70)
ON CONFLICT (code) DO NOTHING;

CREATE TRIGGER trg_payment_providers_updated_at
  BEFORE UPDATE ON public.payment_providers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Extend payment_transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'coins',
  ADD COLUMN IF NOT EXISTS target_ref text,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS payment_transactions_idem_uniq
  ON public.payment_transactions (provider, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS payment_transactions_user_created_idx
  ON public.payment_transactions (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS payment_transactions_kind_status_idx
  ON public.payment_transactions (kind, status);

-- 3. NOTIFICATION CATEGORIES
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS archived_at timestamptz;

UPDATE public.notifications
SET category = CASE
  WHEN type IN ('chapter_new','chapter_scheduled','chapter_reply','reading_reminder') THEN 'reading'
  WHEN type IN ('marketplace','purchase','inventory','mystery_box')                   THEN 'marketplace'
  WHEN type IN ('mission','mission_claim','challenge','battle_pass')                  THEN 'battle_pass'
  WHEN type IN ('ai','ai_generated')                                                  THEN 'ai'
  WHEN type IN ('collection','collection_invite','collection_follow')                 THEN 'collections'
  WHEN type IN ('follow','follower')                                                  THEN 'followers'
  WHEN type IN ('author','author_new_chapter','author_message')                       THEN 'authors'
  WHEN type IN ('payment','coins_purchased','withdrawal','tip','donation')            THEN 'payments'
  WHEN type IN ('admin','report','moderation','ban','warning')                        THEN 'admin'
  ELSE 'system'
END
WHERE category = 'system';

CREATE INDEX IF NOT EXISTS notifications_user_category_read_idx
  ON public.notifications (user_id, category, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_archived_idx
  ON public.notifications (user_id, archived_at)
  WHERE archived_at IS NULL;

CREATE OR REPLACE FUNCTION public.notifications_mark_all_read(_category text DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid; _count integer;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  UPDATE public.notifications
     SET is_read = true
   WHERE user_id = _uid
     AND is_read = false
     AND (_category IS NULL OR category = _category);
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notifications_mark_all_read(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_mark_all_read(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.notifications_archive(_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  _uid := auth.uid();
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  UPDATE public.notifications
     SET archived_at = now()
   WHERE id = _id AND user_id = _uid AND archived_at IS NULL;
  RETURN FOUND;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.notifications_archive(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.notifications_archive(uuid) TO authenticated;
