
-- === 1) Restrict SELECT on social-relation tables to authenticated users ===
DROP POLICY IF EXISTS "follows public counts" ON public.author_follows;
CREATE POLICY "follows read auth" ON public.author_follows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read all follows" ON public.user_follows;
CREATE POLICY "user_follows read auth" ON public.user_follows
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "read likes" ON public.comment_likes;
CREATE POLICY "comment_likes read auth" ON public.comment_likes
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "review_likes_public_read" ON public.review_likes;
CREATE POLICY "review_likes read auth" ON public.review_likes
  FOR SELECT TO authenticated USING (true);

-- === 2) Restrict SELECT on text/chapter reactions to authenticated users ===
DROP POLICY IF EXISTS "text_reactions_public_read" ON public.text_reactions;
CREATE POLICY "text_reactions read auth" ON public.text_reactions
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chreact_read" ON public.chapter_reactions;
CREATE POLICY "chreact read auth" ON public.chapter_reactions
  FOR SELECT TO authenticated USING (true);

-- === 3) Remove user-writable audit log inserts. All audit rows now come from SECURITY DEFINER routines. ===
DROP POLICY IF EXISTS "insert own" ON public.audit_logs;
REVOKE INSERT ON public.audit_logs FROM authenticated, anon;

-- === 4) Lock down SECURITY DEFINER functions ===
-- Revoke everything from anon and authenticated on all public functions, then grant back
-- only the specific routines users must call directly.

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- User-callable RPCs (authorization is enforced inside each function)
GRANT EXECUTE ON FUNCTION public.unlock_chapter(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.gift_coins(uuid, integer, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bump_reading_streak() TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) TO authenticated;

-- Admin RPCs (each checks admin/super-admin internally)
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(uuid, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_coin_purchase(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_author_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_novel_analytics(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_coin_purchase(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_vip(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_storage_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_system_health() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_timeseries(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_author_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_author_application(uuid, text) TO authenticated;

-- Helper predicates used inside RLS policies — must be callable so policies evaluate
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.has_any_admin_role(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_vip(uuid) TO authenticated, anon;

-- Trigger functions, cron jobs, and internal helpers stay revoked from anon/authenticated.
