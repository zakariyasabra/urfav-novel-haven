-- Fix payment_methods RLS: anon can't EXECUTE has_any_admin_role, so the OR-based policy fails for public reads.
-- Split into two clean policies: everyone can read enabled methods, admins can read all.

DROP POLICY IF EXISTS "read enabled methods" ON public.payment_methods;

CREATE POLICY "public read enabled methods"
  ON public.payment_methods
  FOR SELECT
  USING (enabled = true);

CREATE POLICY "admins read all methods"
  ON public.payment_methods
  FOR SELECT
  TO authenticated
  USING (public.has_any_admin_role(auth.uid()));

-- Ensure anon can SELECT enabled rows (only publicly-safe columns are shown in UI)
GRANT SELECT ON public.payment_methods TO anon;
GRANT SELECT ON public.payment_methods TO authenticated;