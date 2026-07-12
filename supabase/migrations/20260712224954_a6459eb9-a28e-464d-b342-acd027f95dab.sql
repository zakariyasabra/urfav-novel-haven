
CREATE OR REPLACE FUNCTION public.admin_dashboard_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_any_admin_role(auth.uid())) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;

  SELECT jsonb_build_object(
    'users_total',       (SELECT count(*) FROM public.profiles),
    'users_new_7d',      (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '7 days'),
    'users_new_30d',     (SELECT count(*) FROM public.profiles WHERE created_at >= now() - interval '30 days'),
    'vip_active',        (SELECT count(*) FROM public.vip_subscriptions WHERE status='active' AND (expires_at IS NULL OR expires_at > now())),
    'authors',           (SELECT count(*) FROM public.user_roles WHERE role='author'),
    'editors',           (SELECT count(*) FROM public.user_roles WHERE role='editor'),
    'moderators',        (SELECT count(*) FROM public.user_roles WHERE role='moderator'),
    'admins',            (SELECT count(*) FROM public.user_roles WHERE role='admin'),
    'novels_total',      (SELECT count(*) FROM public.novels),
    'novels_published',  (SELECT count(*) FROM public.novels WHERE status IN ('ongoing','completed')),
    'chapters_total',    (SELECT count(*) FROM public.chapters),
    'chapters_published',(SELECT count(*) FROM public.chapters WHERE status='published'),
    'views_total',       (SELECT COALESCE(sum(views_count),0) FROM public.novels),
    'comments_total',    (SELECT count(*) FROM public.comments),
    'revenue_coins',     (SELECT COALESCE(sum(coins),0) FROM public.coin_purchase_requests WHERE status='approved'),
    'coins_in_circulation', (SELECT COALESCE(sum(coins),0) FROM public.wallets),
    'pending_payments',  (SELECT count(*) FROM public.coin_purchase_requests WHERE status='pending'),
    'pending_withdrawals',(SELECT count(*) FROM public.withdrawal_requests WHERE status='pending')
  ) INTO result;

  RETURN result;
END $$;

REVOKE ALL ON FUNCTION public.admin_dashboard_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_overview() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_timeseries(_days integer DEFAULT 30)
RETURNS TABLE(day date, new_users int, new_novels int, new_chapters int, revenue_coins int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_any_admin_role(auth.uid())) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;
  IF _days IS NULL OR _days < 1 THEN _days := 30; END IF;
  IF _days > 365 THEN _days := 365; END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (now() AT TIME ZONE 'UTC')::date - (_days - 1),
      (now() AT TIME ZONE 'UTC')::date,
      interval '1 day'
    )::date AS d
  )
  SELECT
    d.d AS day,
    COALESCE((SELECT count(*)::int FROM public.profiles p WHERE (p.created_at AT TIME ZONE 'UTC')::date = d.d), 0) AS new_users,
    COALESCE((SELECT count(*)::int FROM public.novels n WHERE (n.created_at AT TIME ZONE 'UTC')::date = d.d), 0) AS new_novels,
    COALESCE((SELECT count(*)::int FROM public.chapters c WHERE (c.created_at AT TIME ZONE 'UTC')::date = d.d), 0) AS new_chapters,
    COALESCE((SELECT sum(cpr.coins)::int FROM public.coin_purchase_requests cpr WHERE cpr.status='approved' AND (cpr.reviewed_at AT TIME ZONE 'UTC')::date = d.d), 0) AS revenue_coins
  FROM days d
  ORDER BY d.d;
END $$;

REVOKE ALL ON FUNCTION public.admin_timeseries(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_timeseries(integer) TO authenticated;
