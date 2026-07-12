
-- Helper: count active super admins (admin role AND account_status = 'active' or null)
CREATE OR REPLACE FUNCTION public.count_active_super_admins()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::int
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'
    AND COALESCE(p.account_status, 'active') = 'active';
$$;

REVOKE EXECUTE ON FUNCTION public.count_active_super_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.count_active_super_admins() TO authenticated, service_role;

-- Harden admin_revoke_role: block revoking the last admin
CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _role='admin' AND _user_id=auth.uid() THEN RAISE EXCEPTION 'لا يمكنك إزالة صلاحية المدير العام عن نفسك'; END IF;
  IF _role='admin' AND public.has_role(_user_id,'admin') AND public.count_active_super_admins() <= 1 THEN
    RAISE EXCEPTION 'لا يمكن إزالة آخر مدير عام في النظام. قم بتعيين مدير عام آخر أولاً.';
  END IF;
  DELETE FROM public.user_roles WHERE user_id=_user_id AND role=_role;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'revoke_role', 'user', _user_id, jsonb_build_object('role',_role));
END $$;

-- Harden admin_grant_role: only an existing admin can grant admin (transfer)
CREATE OR REPLACE FUNCTION public.admin_grant_role(_user_id uuid, _role app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _role = 'admin' THEN
    -- Only an existing Super Admin may promote another to Super Admin
    IF NOT public.has_role(auth.uid(),'admin') THEN
      RAISE EXCEPTION 'فقط المدير العام يمكنه ترقية حساب آخر إلى مدير عام';
    END IF;
  ELSE
    IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role) ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'grant_role', 'user', _user_id, jsonb_build_object('role',_role));
END $$;

-- Harden admin_set_account_status: block banning/suspending the last active admin
CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status text, _reason text DEFAULT NULL::text, _until timestamp with time zone DEFAULT NULL::timestamp with time zone)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('active','suspended','banned') THEN RAISE EXCEPTION 'bad status'; END IF;
  IF _user_id = auth.uid() AND _status <> 'active' THEN
    RAISE EXCEPTION 'لا يمكنك تعطيل حسابك الخاص';
  END IF;
  IF _status <> 'active' AND public.has_role(_user_id,'admin') AND public.count_active_super_admins() <= 1 THEN
    RAISE EXCEPTION 'لا يمكن تعطيل آخر مدير عام في النظام. قم بتعيين مدير عام آخر أولاً.';
  END IF;
  UPDATE public.profiles SET account_status=_status, status_reason=_reason, suspended_until=_until, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'set_status', 'user', _user_id, jsonb_build_object('status',_status,'reason',_reason,'until',_until));
END $$;

-- Defense in depth: DB-level trigger blocking removal of the last admin role row
CREATE OR REPLACE FUNCTION public.prevent_last_admin_removal()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'admin' THEN
    IF (SELECT COUNT(*) FROM public.user_roles WHERE role='admin') <= 1 THEN
      RAISE EXCEPTION 'لا يمكن إزالة آخر مدير عام في النظام';
    END IF;
  END IF;
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.user_roles;
CREATE TRIGGER trg_prevent_last_admin_removal
BEFORE DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_removal();

-- Also protect against setting an admin's account to non-active via direct table update
CREATE OR REPLACE FUNCTION public.prevent_last_admin_disable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.account_status IS DISTINCT FROM OLD.account_status
     AND COALESCE(NEW.account_status,'active') <> 'active'
     AND public.has_role(NEW.id,'admin') THEN
    IF (SELECT COUNT(*) FROM public.user_roles ur
         LEFT JOIN public.profiles p ON p.id = ur.user_id
         WHERE ur.role='admin' AND COALESCE(p.account_status,'active')='active') <= 1 THEN
      RAISE EXCEPTION 'لا يمكن تعطيل آخر مدير عام في النظام';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_disable ON public.profiles;
CREATE TRIGGER trg_prevent_last_admin_disable
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_admin_disable();
