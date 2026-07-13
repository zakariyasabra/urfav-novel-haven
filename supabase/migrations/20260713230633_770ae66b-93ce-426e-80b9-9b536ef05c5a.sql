
-- 1) Allow admin-granted VIP subs without a plan link
ALTER TABLE public.vip_subscriptions ALTER COLUMN plan_id DROP NOT NULL;

-- 2) Fix admin_adjust_coins
CREATE OR REPLACE FUNCTION public.admin_adjust_coins(_user_id uuid, _delta integer, _note text DEFAULT NULL::text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _bal int;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _delta = 0 THEN RAISE EXCEPTION 'delta must not be zero'; END IF;
  INSERT INTO public.wallets(user_id, coins) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET coins = GREATEST(coins + _delta, 0), updated_at=now() WHERE user_id=_user_id RETURNING coins INTO _bal;
  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note, counterparty_id)
    VALUES (_user_id, CASE WHEN _delta >= 0 THEN 'admin_credit' ELSE 'admin_debit' END, _delta, _bal, _note, auth.uid());
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'admin_adjust_coins', 'user', _user_id::text, jsonb_build_object('delta',_delta,'note',_note));
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (
      _user_id,
      CASE WHEN _delta >= 0 THEN 'coins_credited' ELSE 'coins_debited' END,
      CASE WHEN _delta >= 0 THEN 'تم إضافة عملات إلى محفظتك' ELSE 'تم خصم عملات من محفظتك' END,
      CASE WHEN _delta >= 0 THEN ('+' || _delta::text || ' عملة' || COALESCE(' — ' || _note, ''))
           ELSE (_delta::text || ' عملة' || COALESCE(' — ' || _note, '')) END,
      '/wallet'
    );
  RETURN jsonb_build_object('ok',true,'balance',_bal);
END $function$;

-- 3) Fix admin_grant_role
CREATE OR REPLACE FUNCTION public.admin_grant_role(_user_id uuid, _role app_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF _role = 'admin' THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'فقط المدير العام يمكنه منح دور المدير';
    END IF;
  ELSIF _role IN ('moderator','editor','author','user') THEN
    IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
      RAISE EXCEPTION 'ليس لديك صلاحية';
    END IF;
  ELSE
    RAISE EXCEPTION 'دور غير معروف';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'grant_role', 'user', _user_id::text, jsonb_build_object('role',_role));
END $function$;

-- 4) Fix admin_revoke_role
CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_id uuid, _role app_role)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_super_admin(_user_id) THEN
    RAISE EXCEPTION 'لا يمكن تعديل صلاحيات المدير العام. استخدم نقل المدير العام.';
  END IF;
  IF _role = 'admin' THEN
    IF NOT public.is_super_admin(auth.uid()) THEN
      RAISE EXCEPTION 'فقط المدير العام يمكنه إزالة دور المدير';
    END IF;
  ELSE
    IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
      RAISE EXCEPTION 'ليس لديك صلاحية';
    END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id=_user_id AND role=_role;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'revoke_role', 'user', _user_id::text, jsonb_build_object('role',_role));
END $function$;

-- 5) Fix admin_set_account_status
CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status text, _reason text DEFAULT NULL::text, _until timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;
  IF _status NOT IN ('active','suspended','banned') THEN
    RAISE EXCEPTION 'حالة غير صالحة';
  END IF;
  IF _user_id = auth.uid() AND _status <> 'active' THEN
    RAISE EXCEPTION 'لا يمكنك تعطيل حسابك الخاص';
  END IF;
  IF public.is_super_admin(_user_id) AND _status <> 'active' THEN
    RAISE EXCEPTION 'لا يمكن تعطيل أو حظر حساب المدير العام';
  END IF;
  UPDATE public.profiles
     SET account_status=_status, status_reason=_reason, suspended_until=_until, updated_at=now()
   WHERE id=_user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'set_status', 'user', _user_id::text,
            jsonb_build_object('status',_status,'reason',_reason,'until',_until));
END $function$;

-- 6) Fix admin_grant_vip (drop plan_code, use plan_id NULL, meta col)
CREATE OR REPLACE FUNCTION public.admin_grant_vip(_user_id uuid, _days integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _exp timestamptz;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;
  _exp := now() + make_interval(days => _days);
  INSERT INTO public.vip_subscriptions(user_id, plan_id, status, started_at, expires_at, provider)
    VALUES (_user_id, NULL, 'active', now(), _exp, 'admin_grant');
  UPDATE public.profiles SET is_vip=true, vip_expires_at=_exp, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'grant_vip', 'user', _user_id::text, jsonb_build_object('days',_days));
END $function$;

-- 7) Fix admin_broadcast_notification
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(_title text, _body text, _link text DEFAULT NULL::text, _type text DEFAULT 'announcement'::text)
 RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _n int;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;
  WITH ins AS (
    INSERT INTO public.notifications(user_id, type, title, body, link)
    SELECT p.id, _type, _title, _body, _link FROM public.profiles p
    RETURNING 1
  )
  SELECT count(*) INTO _n FROM ins;
  INSERT INTO public.audit_logs(actor_id, action, target_type, meta)
    VALUES (auth.uid(), 'broadcast', 'notification', jsonb_build_object('count',_n,'title',_title));
  RETURN _n;
END $function$;

-- 8) Fix transfer_super_admin
CREATE OR REPLACE FUNCTION public.transfer_super_admin(_to uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_super_admin(auth.uid()) THEN
    RAISE EXCEPTION 'فقط المدير العام يمكنه نقل الصلاحية';
  END IF;
  IF _to IS NULL OR _to = auth.uid() THEN
    RAISE EXCEPTION 'اختر حساباً آخر';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = _to) THEN
    RAISE EXCEPTION 'المستخدم غير موجود';
  END IF;
  IF COALESCE((SELECT account_status FROM public.profiles WHERE id=_to),'active') <> 'active' THEN
    RAISE EXCEPTION 'لا يمكن نقل الصلاحية إلى حساب غير نشط';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_to, 'admin') ON CONFLICT DO NOTHING;
  UPDATE public.super_admins SET user_id = _to, assigned_at = now() WHERE singleton = true;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
    VALUES (auth.uid(), 'transfer_super_admin', 'user', _to::text,
            jsonb_build_object('from', auth.uid(), 'to', _to));
END $function$;
