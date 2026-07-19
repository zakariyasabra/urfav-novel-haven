
DROP POLICY IF EXISTS "own insert pending" ON public.vip_subscriptions;
CREATE POLICY "own insert pending"
ON public.vip_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('pending','pending_review')
);
