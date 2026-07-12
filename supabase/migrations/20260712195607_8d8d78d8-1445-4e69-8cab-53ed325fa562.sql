
REVOKE SELECT ON public.activity_feed FROM anon;
DROP POLICY IF EXISTS "read activity" ON public.activity_feed;
CREATE POLICY "read own or followed activity" ON public.activity_feed
  FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR ref_user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_follows uf WHERE uf.follower_id = auth.uid() AND uf.followed_id = activity_feed.actor_id)
    OR public.has_any_admin_role(auth.uid())
  );

DROP POLICY IF EXISTS "insert own" ON public.audit_logs;
CREATE POLICY "insert own" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

DROP VIEW IF EXISTS public.search_trending;
CREATE VIEW public.search_trending
  WITH (security_invoker = true) AS
SELECT lower(trim(query)) AS query, count(*)::int AS hits, max(created_at) AS last_seen
FROM public.search_history
WHERE created_at > now() - interval '7 days' AND length(trim(query)) >= 2
GROUP BY lower(trim(query))
ORDER BY count(*) DESC
LIMIT 50;
GRANT SELECT ON public.search_trending TO anon, authenticated;
