-- Root cause: "Admins manage novels" was TO public and called has_role(),
-- which anon cannot EXECUTE. Postgres resolves function-privilege at plan
-- time for every policy that could apply to the current role, so ALL anon
-- reads of novels (and any join through novels, e.g. chapters -> novels)
-- failed with 42501. Scope the management policies to authenticated.

DROP POLICY IF EXISTS "Admins manage novels" ON public.novels;
CREATE POLICY "Admins manage novels"
  ON public.novels
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- (authors manage own novels + authors read own unpublished novels are already TO authenticated.)