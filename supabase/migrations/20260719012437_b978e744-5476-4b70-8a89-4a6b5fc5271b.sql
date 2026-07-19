-- Batch 7C: Premium Content

ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS coin_price integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.novel_ownership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  coins_spent integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'purchase',
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, novel_id)
);

GRANT SELECT, INSERT ON public.novel_ownership TO authenticated;
GRANT ALL ON public.novel_ownership TO service_role;
ALTER TABLE public.novel_ownership ENABLE ROW LEVEL SECURITY;

CREATE POLICY "novel_ownership_self_read"
  ON public.novel_ownership FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_any_admin_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_novel_ownership_user ON public.novel_ownership(user_id, novel_id);
CREATE INDEX IF NOT EXISTS idx_novel_ownership_novel ON public.novel_ownership(novel_id);

-- ============ RPC: purchase_novel ============
CREATE OR REPLACE FUNCTION public.purchase_novel(_novel_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _price int;
  _premium boolean;
  _author uuid;
  _balance int;
  _author_share int;
  _already boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT n.coin_price, n.is_premium, n.owner_id
    INTO _price, _premium, _author
    FROM public.novels n WHERE n.id = _novel_id;
  IF _price IS NULL THEN RAISE EXCEPTION 'novel not found'; END IF;
  IF _price <= 0 THEN RAISE EXCEPTION 'novel is not purchasable'; END IF;

  SELECT EXISTS(SELECT 1 FROM public.novel_ownership WHERE user_id=_uid AND novel_id=_novel_id) INTO _already;
  IF _already THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;

  INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  SELECT coins INTO _balance FROM public.wallets WHERE user_id=_uid FOR UPDATE;
  IF _balance < _price THEN RAISE EXCEPTION 'insufficient coins'; END IF;

  UPDATE public.wallets SET coins = coins - _price, updated_at=now()
    WHERE user_id=_uid RETURNING coins INTO _balance;

  INSERT INTO public.novel_ownership(user_id, novel_id, coins_spent, source)
    VALUES (_uid, _novel_id, _price, 'purchase');

  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, ref_novel_id, counterparty_id, note)
    VALUES (_uid, 'spend_purchase_novel', -_price, _balance, _novel_id, _author, 'novel_purchase');

  IF _author IS NOT NULL AND _author <> _uid THEN
    _author_share := (_price * 80) / 100;
    INSERT INTO public.author_earnings(author_id, coins_total, coins_pending)
      VALUES (_author, _author_share, _author_share)
      ON CONFLICT (author_id) DO UPDATE SET
        coins_total = author_earnings.coins_total + EXCLUDED.coins_total,
        coins_pending = author_earnings.coins_pending + EXCLUDED.coins_pending,
        updated_at = now();
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, ref_novel_id, counterparty_id, note)
      VALUES (_author, 'earn_purchase_novel', _author_share, 0, _novel_id, _uid, 'novel_purchase');
  END IF;

  RETURN jsonb_build_object('ok', true, 'balance', _balance);
END $$;

REVOKE EXECUTE ON FUNCTION public.purchase_novel(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.purchase_novel(uuid) TO authenticated;

-- ============ RPC: can_read_chapter (permission middleware) ============
CREATE OR REPLACE FUNCTION public.can_read_chapter(_chapter_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _price int;
  _is_vip_ch boolean;
  _novel_id uuid;
BEGIN
  SELECT c.coin_price, c.is_vip, c.novel_id
    INTO _price, _is_vip_ch, _novel_id
    FROM public.chapters c WHERE c.id = _chapter_id;
  IF _novel_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_found');
  END IF;
  IF COALESCE(_price,0) <= 0 AND NOT COALESCE(_is_vip_ch,false) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'free');
  END IF;
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'auth_required',
      'price', COALESCE(_price,0), 'is_vip', COALESCE(_is_vip_ch,false));
  END IF;
  IF EXISTS(SELECT 1 FROM public.novel_ownership WHERE user_id=_uid AND novel_id=_novel_id) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'owned');
  END IF;
  IF EXISTS(SELECT 1 FROM public.chapter_unlocks WHERE user_id=_uid AND chapter_id=_chapter_id) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'unlocked');
  END IF;
  IF public.is_vip(_uid) THEN
    RETURN jsonb_build_object('allowed', true, 'reason', 'vip');
  END IF;
  RETURN jsonb_build_object('allowed', false, 'reason', 'paywall',
    'price', COALESCE(_price,0), 'is_vip', COALESCE(_is_vip_ch,false));
END $$;

REVOKE EXECUTE ON FUNCTION public.can_read_chapter(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_chapter(uuid) TO anon, authenticated;

-- ============ Extend unlock_chapter to honor novel ownership ============
CREATE OR REPLACE FUNCTION public.unlock_chapter(_chapter_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _price int;
  _novel_id uuid;
  _author uuid;
  _is_vip_ch boolean;
  _balance int;
  _author_share int;
  _already boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT c.coin_price, c.novel_id, c.is_vip, n.owner_id INTO _price, _novel_id, _is_vip_ch, _author
    FROM public.chapters c JOIN public.novels n ON n.id = c.novel_id
    WHERE c.id = _chapter_id;
  IF _price IS NULL THEN RAISE EXCEPTION 'chapter not found'; END IF;
  IF _price <= 0 AND NOT _is_vip_ch THEN RAISE EXCEPTION 'chapter is free'; END IF;

  -- Whole-novel ownership grants access without spending
  IF EXISTS(SELECT 1 FROM public.novel_ownership WHERE user_id=_uid AND novel_id=_novel_id) THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'reason', 'owned');
  END IF;

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