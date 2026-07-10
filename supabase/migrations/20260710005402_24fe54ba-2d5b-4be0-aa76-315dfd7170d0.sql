
-- 1) Chapters: restrict public read (hide drafts, scheduled, VIP unless entitled)
DROP POLICY IF EXISTS "Chapters public read" ON public.chapters;

CREATE POLICY "Chapters public read published free"
ON public.chapters FOR SELECT
TO anon, authenticated
USING (
  status = 'published'
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND is_vip = false
  AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.is_published = true)
);

CREATE POLICY "Chapters VIP read"
ON public.chapters FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND is_vip = true
  AND public.is_vip(auth.uid())
  AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.is_published = true)
);

CREATE POLICY "Chapters owner/admin read"
ON public.chapters FOR SELECT
TO authenticated
USING (
  public.has_any_admin_role(auth.uid())
  OR EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.owner_id = auth.uid())
);

-- 2) Reports: replace WITH CHECK (true) with concrete constraints
DROP POLICY IF EXISTS "anyone can submit" ON public.reports;

CREATE POLICY "authenticated submit reports"
ON public.reports FOR INSERT
TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  AND length(content) BETWEEN 3 AND 4000
);

CREATE POLICY "anon submit reports"
ON public.reports FOR INSERT
TO anon
WITH CHECK (
  reporter_id IS NULL
  AND reporter_email IS NOT NULL
  AND reporter_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND length(content) BETWEEN 3 AND 4000
);

-- 3) Sanitize search input (defense in depth alongside app-level fix)
--    (nothing DB-side needed; handled in application code)

-- 4) Minimize SECURITY DEFINER function exposure
REVOKE EXECUTE ON FUNCTION public.approve_author_application(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_author_application(uuid, text)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_vip(uuid)                           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_admin_role(uuid)               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_due_chapters()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_novel_view(uuid)             FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_chapter_view(uuid)           FROM PUBLIC;

-- Re-grant only what the app truly needs.
-- approve/reject: called by admins via RPC — self-checks role inside; must be callable by signed-in users.
GRANT EXECUTE ON FUNCTION public.approve_author_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_author_application(uuid, text)  TO authenticated;
-- View counters: called by anon and authenticated readers.
GRANT EXECUTE ON FUNCTION public.increment_novel_view(uuid)   TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_chapter_view(uuid) TO anon, authenticated;
-- is_vip / has_role / has_any_admin_role: only referenced inside SECURITY DEFINER policies/functions
-- (which run as the owner), so anon/authenticated do NOT need direct EXECUTE.
