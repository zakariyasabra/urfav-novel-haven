DROP POLICY IF EXISTS "reputation authenticated read" ON public.reputation;
DROP POLICY IF EXISTS "reputation owner read" ON public.reputation;
CREATE POLICY "reputation owner read" ON public.reputation FOR SELECT TO authenticated USING (auth.uid() = user_id);