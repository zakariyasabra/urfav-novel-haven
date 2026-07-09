DROP POLICY IF EXISTS "Novels public read" ON public.novels;
CREATE POLICY "Novels public read" ON public.novels
  FOR SELECT USING (is_published = true);
