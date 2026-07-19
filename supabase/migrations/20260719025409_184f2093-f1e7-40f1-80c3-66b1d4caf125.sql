-- Allow authenticated users to create their own pending VIP subscription requests.
-- Admins retain full management via the existing "admin manage" policy.
DROP POLICY IF EXISTS "own insert pending" ON public.vip_subscriptions;
CREATE POLICY "own insert pending"
ON public.vip_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status = 'pending'
);