
-- 1) profiles: hide moderation fields from public SELECT via column-level grants
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, username, display_name, avatar_url, bio, is_vip, vip_expires_at,
  created_at, updated_at, social_links, author_bio, cover_url, is_verified,
  pref_language, pref_theme, bio_ar, bio_en
) ON public.profiles TO anon, authenticated;
-- Keep INSERT/UPDATE for owner (RLS still applies)
GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

-- Admin RPC to read moderation fields together with public fields
CREATE OR REPLACE FUNCTION public.admin_list_users(_search text DEFAULT NULL, _limit int DEFAULT 100)
RETURNS TABLE (
  id uuid, username text, display_name text, avatar_url text,
  is_vip boolean, vip_expires_at timestamptz,
  account_status text, status_reason text, suspended_until timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_any_admin_role(auth.uid())) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;
  IF _limit IS NULL OR _limit < 1 THEN _limit := 100; END IF;
  IF _limit > 500 THEN _limit := 500; END IF;

  RETURN QUERY
  SELECT p.id, p.username, p.display_name, p.avatar_url,
         p.is_vip, p.vip_expires_at,
         p.account_status, p.status_reason, p.suspended_until,
         p.created_at
  FROM public.profiles p
  WHERE _search IS NULL
     OR p.username     ILIKE '%'||replace(replace(replace(_search,'%',''),'_',''),',','')||'%'
     OR p.display_name ILIKE '%'||replace(replace(replace(_search,'%',''),'_',''),',','')||'%'
  ORDER BY p.created_at DESC
  LIMIT _limit;
END $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text, int) TO authenticated;

-- 2) super_admins: restrict SELECT to admins only
DROP POLICY IF EXISTS super_admin_read ON public.super_admins;
CREATE POLICY super_admin_read ON public.super_admins
  FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_any_admin_role(auth.uid()));

-- 3) SECURITY DEFINER functions: revoke public/anon exposure where not needed
-- Trigger functions are called by the trigger system, never directly
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_disable()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_last_admin_removal()       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_super_admin_profile_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                  FROM PUBLIC, anon, authenticated;

-- Cron / scheduled maintenance: runs as postgres, not clients
REVOKE EXECUTE ON FUNCTION public.publish_due_chapters()             FROM PUBLIC, anon, authenticated;

-- Anonymous should never call any admin/user-action definer RPC
REVOKE EXECUTE ON FUNCTION public.admin_adjust_coins(uuid, int, text)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_coin_purchase(uuid, text)                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_coin_purchase(uuid, text)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid, text)                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid, text)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_role(uuid, app_role)                          FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid, app_role)                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_grant_vip(uuid, int)                                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_vip(uuid)                                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text, text, timestamptz)   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_dashboard_overview()                                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_timeseries(int)                                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_novel_analytics(uuid)                               FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_author_analytics(uuid)                              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_author_application(uuid, text)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_author_application(uuid, text)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.transfer_super_admin(uuid)                                FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(int, text, text)                       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlock_chapter(uuid)                                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.gift_coins(uuid, int, uuid, text)                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bump_reading_streak()                                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.count_active_super_admins()                               FROM PUBLIC, anon;
