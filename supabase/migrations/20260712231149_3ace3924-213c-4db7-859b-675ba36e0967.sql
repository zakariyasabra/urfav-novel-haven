
-- Per-novel analytics
CREATE OR REPLACE FUNCTION public.admin_novel_analytics(_novel_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _owner uuid;
  result jsonb;
BEGIN
  SELECT owner_id INTO _owner FROM public.novels WHERE id = _novel_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'الرواية غير موجودة'; END IF;
  IF NOT (public.is_super_admin(auth.uid())
       OR public.has_any_admin_role(auth.uid())
       OR _owner = auth.uid()) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;

  SELECT jsonb_build_object(
    'views_total',      COALESCE((SELECT views_count FROM public.novels WHERE id = _novel_id), 0),
    'chapters_total',   (SELECT count(*) FROM public.chapters WHERE novel_id = _novel_id),
    'chapters_published',(SELECT count(*) FROM public.chapters WHERE novel_id = _novel_id AND status='published'),
    'chapter_views',    (SELECT COALESCE(sum(views_count),0) FROM public.chapters WHERE novel_id = _novel_id),
    'unique_readers',   (SELECT count(DISTINCT user_id) FROM public.reading_history WHERE novel_id = _novel_id),
    'favorites',        (SELECT count(*) FROM public.favorites WHERE novel_id = _novel_id),
    'comments',         (SELECT count(*) FROM public.comments WHERE novel_id = _novel_id),
    'rating_avg',       COALESCE((SELECT rating_avg FROM public.novels WHERE id = _novel_id), 0),
    'rating_count',     COALESCE((SELECT rating_count FROM public.novels WHERE id = _novel_id), 0),
    'unlocks',          (SELECT count(*) FROM public.chapter_unlocks WHERE novel_id = _novel_id),
    'coins_earned',     (SELECT COALESCE(sum(amount),0) FROM public.coin_transactions
                          WHERE ref_novel_id = _novel_id AND kind IN ('earn_unlock','earn_gift')),
    'gifts_received',   (SELECT count(*) FROM public.coin_gifts WHERE novel_id = _novel_id),
    'gift_coins',       (SELECT COALESCE(sum(amount),0) FROM public.coin_gifts WHERE novel_id = _novel_id)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_novel_analytics(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_novel_analytics(uuid) TO authenticated;

-- Per-author analytics
CREATE OR REPLACE FUNCTION public.admin_author_analytics(_author_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  IF _author_id IS NULL THEN RAISE EXCEPTION 'المستخدم غير موجود'; END IF;
  IF NOT (public.is_super_admin(auth.uid())
       OR public.has_any_admin_role(auth.uid())
       OR _author_id = auth.uid()) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;

  SELECT jsonb_build_object(
    'novels_total',      (SELECT count(*) FROM public.novels WHERE owner_id = _author_id),
    'novels_published',  (SELECT count(*) FROM public.novels WHERE owner_id = _author_id AND is_published = true),
    'chapters_total',    (SELECT count(*) FROM public.chapters c
                            JOIN public.novels n ON n.id = c.novel_id
                            WHERE n.owner_id = _author_id),
    'chapters_published',(SELECT count(*) FROM public.chapters c
                            JOIN public.novels n ON n.id = c.novel_id
                            WHERE n.owner_id = _author_id AND c.status='published'),
    'views_total',       (SELECT COALESCE(sum(views_count),0) FROM public.novels WHERE owner_id = _author_id),
    'followers',         (SELECT count(*) FROM public.author_follows WHERE author_id = _author_id),
    'favorites',         (SELECT count(*) FROM public.favorites f
                            JOIN public.novels n ON n.id = f.novel_id
                            WHERE n.owner_id = _author_id),
    'unique_readers',    (SELECT count(DISTINCT rh.user_id) FROM public.reading_history rh
                            JOIN public.novels n ON n.id = rh.novel_id
                            WHERE n.owner_id = _author_id),
    'vip_readers',       (SELECT count(DISTINCT rh.user_id) FROM public.reading_history rh
                            JOIN public.novels n ON n.id = rh.novel_id
                            JOIN public.vip_subscriptions v ON v.user_id = rh.user_id
                              AND v.status='active' AND (v.expires_at IS NULL OR v.expires_at > now())
                            WHERE n.owner_id = _author_id),
    'coins_total',       COALESCE((SELECT coins_total FROM public.author_earnings WHERE author_id = _author_id), 0),
    'coins_pending',     COALESCE((SELECT coins_pending FROM public.author_earnings WHERE author_id = _author_id), 0),
    'coins_paid_out',    COALESCE((SELECT coins_paid_out FROM public.author_earnings WHERE author_id = _author_id), 0),
    'gifts_received',    (SELECT count(*) FROM public.coin_gifts WHERE author_id = _author_id),
    'gift_coins',        (SELECT COALESCE(sum(amount),0) FROM public.coin_gifts WHERE author_id = _author_id)
  ) INTO result;
  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_author_analytics(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_author_analytics(uuid) TO authenticated;
