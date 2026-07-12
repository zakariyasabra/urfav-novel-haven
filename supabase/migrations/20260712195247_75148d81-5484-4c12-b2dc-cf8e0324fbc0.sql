
-- 1) Drop overly permissive UPDATE policies on chapters/novels.
DROP POLICY IF EXISTS "Anyone can bump chapter views" ON public.chapters;
DROP POLICY IF EXISTS "Anyone can bump novel views" ON public.novels;

-- Ensure increment RPCs are callable from client (they are SECURITY DEFINER and only bump views_count).
GRANT EXECUTE ON FUNCTION public.increment_chapter_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_novel_view(uuid) TO anon, authenticated;

-- 2) Restrict site_settings public read: exclude sensitive keys (smtp/secret/private/api-key etc).
DROP POLICY IF EXISTS "public read" ON public.site_settings;
CREATE POLICY "public read non-sensitive"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (
    key !~* '(smtp|secret|private|api[_-]?key|password|token|credential)'
  );
CREATE POLICY "admins read all site settings"
  ON public.site_settings
  FOR SELECT
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- 3) Revoke EXECUTE on admin-only SECURITY DEFINER functions from anon/authenticated/public.
-- These functions perform has_any_admin_role/has_role checks internally, but should not be
-- callable by non-admin roles per the Supabase linter recommendation.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'admin_adjust_coins(uuid,integer,text)',
    'admin_approve_coin_purchase(uuid,text)',
    'admin_approve_withdrawal(uuid,text)',
    'admin_grant_role(uuid,app_role)',
    'admin_grant_vip(uuid,integer)',
    'admin_reject_coin_purchase(uuid,text)',
    'admin_reject_withdrawal(uuid,text)',
    'admin_revoke_role(uuid,app_role)',
    'admin_revoke_vip(uuid)',
    'admin_set_account_status(uuid,text,text,timestamp with time zone)',
    'approve_author_application(uuid,text)',
    'reject_author_application(uuid,text)',
    'publish_due_chapters()'
  ]
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO service_role', fn);
  END LOOP;
END $$;
