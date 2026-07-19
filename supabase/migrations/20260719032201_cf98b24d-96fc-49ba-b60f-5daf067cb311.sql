
ALTER TABLE public.vip_subscriptions
  ADD COLUMN IF NOT EXISTS payment_method_id uuid REFERENCES public.payment_methods(id),
  ADD COLUMN IF NOT EXISTS proof_image_url text,
  ADD COLUMN IF NOT EXISTS proof_ref text,
  ADD COLUMN IF NOT EXISTS proof_note text,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_note text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;

CREATE INDEX IF NOT EXISTS vip_subs_status_created_idx ON public.vip_subscriptions(status, created_at DESC);

DROP POLICY IF EXISTS "own insert pending" ON public.vip_subscriptions;
CREATE POLICY "own insert pending"
ON public.vip_subscriptions
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('pending','pending_review')
);

CREATE OR REPLACE FUNCTION public.admin_approve_vip(_sub_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _sub public.vip_subscriptions;
  _days int;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO _sub FROM public.vip_subscriptions WHERE id = _sub_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _sub.status = 'active' THEN RAISE EXCEPTION 'already processed'; END IF;

  SELECT duration_days INTO _days FROM public.vip_plans WHERE id = _sub.plan_id;
  _days := COALESCE(_days, 30);

  UPDATE public.vip_subscriptions
    SET status = 'active',
        started_at = COALESCE(started_at, now()),
        expires_at = now() + make_interval(days => _days),
        admin_note = COALESCE(_note, admin_note),
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        updated_at = now()
  WHERE id = _sub_id;

  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'admin_approve_vip', 'vip_subscription', _sub_id::text,
            jsonb_build_object('note', _note));

  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_sub.user_id, 'vip_approved',
            'تم تفعيل اشتراك VIP',
            'تهانينا! تم تفعيل اشتراك VIP الخاص بك.',
            '/vip');
END $fn$;

CREATE OR REPLACE FUNCTION public.admin_reject_vip(_sub_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  _sub public.vip_subscriptions;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO _sub FROM public.vip_subscriptions WHERE id = _sub_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF _sub.status = 'active' THEN RAISE EXCEPTION 'already processed'; END IF;

  UPDATE public.vip_subscriptions
    SET status = 'rejected',
        admin_note = _reason,
        reviewed_at = now(),
        reviewed_by = auth.uid(),
        updated_at = now()
  WHERE id = _sub_id;

  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'admin_reject_vip', 'vip_subscription', _sub_id::text,
            jsonb_build_object('reason', _reason));

  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_sub.user_id, 'vip_rejected',
            'تم رفض طلب VIP',
            COALESCE('تم رفض طلبك. السبب: ' || _reason, 'تم رفض طلب اشتراك VIP.'),
            '/vip');
END $fn$;

REVOKE ALL ON FUNCTION public.admin_approve_vip(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_reject_vip(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_vip(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_vip(uuid, text) TO authenticated;
