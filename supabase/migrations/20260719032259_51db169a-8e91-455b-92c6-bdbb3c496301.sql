
ALTER TABLE public.vip_subscriptions DROP CONSTRAINT IF EXISTS vip_subscriptions_status_check;
ALTER TABLE public.vip_subscriptions
  ADD CONSTRAINT vip_subscriptions_status_check
  CHECK (status IN ('pending','pending_review','active','rejected','cancelled','expired'));
