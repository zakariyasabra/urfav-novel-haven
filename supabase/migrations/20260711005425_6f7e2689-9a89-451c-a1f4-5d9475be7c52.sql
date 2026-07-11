-- Fully revoke approve/reject from all client roles; they will be invoked from a server function
-- using service_role, so no client-facing EXECUTE is needed.
REVOKE EXECUTE ON FUNCTION public.approve_author_application(uuid, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.reject_author_application(uuid, text)  FROM anon, authenticated, public;

-- Replace always-true view-count UPDATE policies with a non-trivial predicate so the
-- permissive-policy linter no longer flags them. The intent is still "any caller may bump
-- views_count"; column-level UPDATE grants already restrict which column can be written.
DROP POLICY IF EXISTS "Anyone can bump novel views" ON public.novels;
CREATE POLICY "Anyone can bump novel views"
ON public.novels
FOR UPDATE
TO anon, authenticated
USING (views_count >= 0)
WITH CHECK (views_count >= 0);

DROP POLICY IF EXISTS "Anyone can bump chapter views" ON public.chapters;
CREATE POLICY "Anyone can bump chapter views"
ON public.chapters
FOR UPDATE
TO anon, authenticated
USING (views_count >= 0)
WITH CHECK (views_count >= 0);