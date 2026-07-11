-- 1) Revoke EXECUTE on all public SECURITY DEFINER functions from anon/authenticated/public.
--    has_role/is_vip/has_any_admin_role/handle_new_user/publish_due_chapters were already revoked;
--    re-run for idempotency. Also revoke from increment_* and approve/reject to eliminate the
--    executability linter finding entirely.
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_any_admin_role(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.is_vip(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.publish_due_chapters() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_novel_view(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_chapter_view(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.approve_author_application(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reject_author_application(uuid, text) FROM anon, authenticated, public;

-- Re-grant admin RPCs only to authenticated; the functions perform their own admin check internally.
GRANT EXECUTE ON FUNCTION public.approve_author_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_author_application(uuid, text) TO authenticated;

-- Replace the SECURITY DEFINER view-count bumpers with SECURITY INVOKER versions that do not
-- require special privileges; view increments are non-critical and can be lost if the client
-- doesn't have permission. This removes the linter finding entirely for those functions.
CREATE OR REPLACE FUNCTION public.increment_novel_view(_novel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.novels SET views_count = views_count + 1 WHERE id = _novel_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_chapter_view(_chapter_id uuid)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE public.chapters SET views_count = views_count + 1 WHERE id = _chapter_id;
$$;

GRANT EXECUTE ON FUNCTION public.increment_novel_view(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_chapter_view(uuid) TO anon, authenticated;

-- Allow anon/authenticated to bump only the views_count column on novels/chapters via a
-- dedicated permissive policy scoped to that column path. Use column-level UPDATE grant.
GRANT UPDATE (views_count) ON public.novels TO anon, authenticated;
GRANT UPDATE (views_count) ON public.chapters TO anon, authenticated;

DROP POLICY IF EXISTS "Anyone can bump novel views" ON public.novels;
CREATE POLICY "Anyone can bump novel views"
ON public.novels
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can bump chapter views" ON public.chapters;
CREATE POLICY "Anyone can bump chapter views"
ON public.chapters
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2) Tighten chapters public read: recreate the anon path with a stricter, explicit predicate
-- and drop the "Admins manage chapters" catch-all that used the broad {public} role.
DROP POLICY IF EXISTS "Chapters public read published free" ON public.chapters;
DROP POLICY IF EXISTS "Admins manage chapters" ON public.chapters;

-- Public/anon: only fully-published, non-VIP, released chapters of published novels.
CREATE POLICY "Chapters anon read published free only"
ON public.chapters
FOR SELECT
TO anon
USING (
  status = 'published'::chapter_status
  AND is_vip = false
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND EXISTS (
    SELECT 1 FROM public.novels n
    WHERE n.id = chapters.novel_id
      AND n.is_published = true
  )
);

-- Authenticated non-VIP baseline: same strict predicate.
CREATE POLICY "Chapters auth read published free only"
ON public.chapters
FOR SELECT
TO authenticated
USING (
  status = 'published'::chapter_status
  AND is_vip = false
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND EXISTS (
    SELECT 1 FROM public.novels n
    WHERE n.id = chapters.novel_id
      AND n.is_published = true
  )
);

-- Admins keep full manage rights, scoped to authenticated only (not public role).
CREATE POLICY "Admins manage chapters"
ON public.chapters
FOR ALL
TO authenticated
USING (public.has_any_admin_role(auth.uid()))
WITH CHECK (public.has_any_admin_role(auth.uid()));

-- 3) user_roles: make the intent explicit — no client writes allowed. Add restrictive-style
-- policies that deny INSERT/UPDATE/DELETE to anon and authenticated. Privileged writes must
-- go through SECURITY DEFINER admin RPCs or service_role.
DROP POLICY IF EXISTS "No client insert on user_roles" ON public.user_roles;
CREATE POLICY "No client insert on user_roles"
ON public.user_roles
FOR INSERT
TO anon, authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "No client update on user_roles" ON public.user_roles;
CREATE POLICY "No client update on user_roles"
ON public.user_roles
FOR UPDATE
TO anon, authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS "No client delete on user_roles" ON public.user_roles;
CREATE POLICY "No client delete on user_roles"
ON public.user_roles
FOR DELETE
TO anon, authenticated
USING (false);