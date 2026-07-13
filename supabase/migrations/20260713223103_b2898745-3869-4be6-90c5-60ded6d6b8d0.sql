-- Same class of bug: policies TO public that call has_role/has_any_admin_role
-- fail with 42501 for anon, blocking every anon read of these tables.

DROP POLICY IF EXISTS "Admins delete any comment" ON public.comments;
CREATE POLICY "Admins delete any comment"
  ON public.comments FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage genres" ON public.genres;
CREATE POLICY "Admins manage genres"
  ON public.genres FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins manage novel_genres" ON public.novel_genres;
CREATE POLICY "Admins manage novel_genres"
  ON public.novel_genres FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- vip_plans: split public/admin so anon doesn't trip has_any_admin_role
DROP POLICY IF EXISTS "public read active" ON public.vip_plans;
CREATE POLICY "public read active plans"
  ON public.vip_plans FOR SELECT
  USING (is_active = true);
CREATE POLICY "admins read all plans"
  ON public.vip_plans FOR SELECT TO authenticated
  USING (public.has_any_admin_role(auth.uid()));