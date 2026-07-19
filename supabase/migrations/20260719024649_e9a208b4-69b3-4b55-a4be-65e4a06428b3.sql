
DROP POLICY IF EXISTS "reputation public read" ON public.reputation;
CREATE POLICY "reputation authenticated read" ON public.reputation FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_achievements public read" ON public.user_achievements;
CREATE POLICY "user_achievements authenticated read" ON public.user_achievements FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_badges public read" ON public.user_badges;
CREATE POLICY "user_badges authenticated read" ON public.user_badges FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.reputation FROM anon;
REVOKE SELECT ON public.user_achievements FROM anon;
REVOKE SELECT ON public.user_badges FROM anon;
