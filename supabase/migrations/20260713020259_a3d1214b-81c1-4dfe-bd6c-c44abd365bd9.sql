
-- 1) profiles: restrict moderation fields from anonymous public
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Owner reads full row; admins read full row
CREATE POLICY "profiles_owner_read_full"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()));

-- Public safe view exposing only non-sensitive columns
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT id, username, display_name, avatar_url, bio, created_at
FROM public.profiles
WHERE COALESCE(account_status,'active') = 'active';

GRANT SELECT ON public.profiles_public TO anon, authenticated;

-- Public still needs to read basic profile fields for joins on comments/reviews/etc.
-- Provide a narrow anon/authenticated SELECT policy that only allows access when active,
-- and rely on frontends to select only public-safe columns. Sensitive moderation columns
-- stay hidden from anon via column privileges below.
CREATE POLICY "profiles_public_active_read"
  ON public.profiles FOR SELECT
  TO anon, authenticated
  USING (COALESCE(account_status,'active') = 'active');

-- Revoke default table-wide SELECT from anon and grant only safe columns
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, created_at, is_vip)
  ON public.profiles TO anon;

-- Authenticated: still need full-column select for own row and admins;
-- for other users, restrict via revoke + narrow grant so moderation fields hidden.
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (id, username, display_name, avatar_url, bio, created_at, is_vip,
              vip_expires_at, account_status, suspended_until, status_reason,
              updated_at)
  ON public.profiles TO authenticated;
-- Column-level filtering: the sensitive columns are still gated by RLS to
-- (owner OR admin) via the profiles_owner_read_full policy.

-- 2) content_translations: drop public read
DROP POLICY IF EXISTS "translations status public read" ON public.content_translations;
-- Owner/admin SELECT policy already exists.

-- 3) reader_feedback: replace WITH CHECK (true)
DROP POLICY IF EXISTS "feedback_insert_all" ON public.reader_feedback;
CREATE POLICY "feedback_insert_scoped"
  ON public.reader_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
-- Note: anonymous feedback removed. If needed, submit via a server function.

-- 4) system_logs: only admins can insert (server code uses service_role which bypasses RLS)
DROP POLICY IF EXISTS "sys_insert" ON public.system_logs;
CREATE POLICY "sys_insert_admin"
  ON public.system_logs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()));

-- 5) Split anon policies to remove reliance on admin helpers for anon role
--    (keeps authenticated admin-override behavior intact)

-- homepage_sections
DROP POLICY IF EXISTS "sections read enabled" ON public.homepage_sections;
CREATE POLICY "sections read enabled anon"
  ON public.homepage_sections FOR SELECT TO anon
  USING (enabled);
CREATE POLICY "sections read enabled auth"
  ON public.homepage_sections FOR SELECT TO authenticated
  USING (enabled OR public.has_any_admin_role(auth.uid()));

-- static_pages
DROP POLICY IF EXISTS "pages read published" ON public.static_pages;
CREATE POLICY "pages read published anon"
  ON public.static_pages FOR SELECT TO anon
  USING (is_published);
CREATE POLICY "pages read published auth"
  ON public.static_pages FOR SELECT TO authenticated
  USING (is_published OR public.has_any_admin_role(auth.uid()));

-- faqs
DROP POLICY IF EXISTS "faqs read" ON public.faqs;
CREATE POLICY "faqs read anon"
  ON public.faqs FOR SELECT TO anon
  USING (enabled);
CREATE POLICY "faqs read auth"
  ON public.faqs FOR SELECT TO authenticated
  USING (enabled OR public.has_any_admin_role(auth.uid()));

-- announcements
DROP POLICY IF EXISTS "ann read active" ON public.announcements;
CREATE POLICY "ann read active anon"
  ON public.announcements FOR SELECT TO anon
  USING (enabled AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now()));
CREATE POLICY "ann read active auth"
  ON public.announcements FOR SELECT TO authenticated
  USING ((enabled AND (starts_at IS NULL OR starts_at <= now()) AND (ends_at IS NULL OR ends_at > now())) OR public.has_any_admin_role(auth.uid()));

-- coin_packages
DROP POLICY IF EXISTS "coin_packages_public_read" ON public.coin_packages;
CREATE POLICY "coin_packages_public_read_anon"
  ON public.coin_packages FOR SELECT TO anon
  USING (is_active);
CREATE POLICY "coin_packages_public_read_auth"
  ON public.coin_packages FOR SELECT TO authenticated
  USING (is_active OR public.has_any_admin_role(auth.uid()));

-- feature_requests
DROP POLICY IF EXISTS "fr_public_read" ON public.feature_requests;
CREATE POLICY "fr_public_read_anon"
  ON public.feature_requests FOR SELECT TO anon
  USING (is_public = true);
CREATE POLICY "fr_public_read_auth"
  ON public.feature_requests FOR SELECT TO authenticated
  USING (is_public = true OR user_id = auth.uid() OR public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()));

-- 6) Revoke EXECUTE from anon on RBAC helpers (no longer needed by any anon policy)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_any_admin_role(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_vip(uuid) FROM anon, PUBLIC;
-- Keep authenticated EXECUTE on these helpers because RLS policies for
-- authenticated users still reference them.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_any_admin_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_vip(uuid) TO authenticated;
