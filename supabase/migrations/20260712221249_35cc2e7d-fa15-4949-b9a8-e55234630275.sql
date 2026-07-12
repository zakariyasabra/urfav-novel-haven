
-- 1) Super Admin singleton table
CREATE TABLE IF NOT EXISTS public.super_admins (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton = true),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  assigned_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.super_admins TO authenticated;
GRANT ALL ON public.super_admins TO service_role;
ALTER TABLE public.super_admins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "super_admin_read" ON public.super_admins;
CREATE POLICY "super_admin_read" ON public.super_admins FOR SELECT TO authenticated USING (true);

-- 2) Seed initial Super Admin (existing admin)
INSERT INTO public.super_admins (singleton, user_id)
VALUES (true, '98b9b0a8-93b8-472c-8693-ea5ca0009da0')
ON CONFLICT (singleton) DO NOTHING;

-- 3) Helper
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon, authenticated, service_role;

-- 4) Remove auto-admin on first signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  counter INT := 0;
BEGIN
  base_username := COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1), 'user');
  base_username := regexp_replace(base_username, '[^a-zA-Z0-9_]', '', 'g');
  IF base_username = '' THEN base_username := 'user'; END IF;
  final_username := base_username;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) LOOP
    counter := counter + 1;
    final_username := base_username || counter::text;
  END LOOP;
  INSERT INTO public.profiles (id, username, display_name)
    VALUES (NEW.id, final_username, COALESCE(NEW.raw_user_meta_data->>'display_name', final_username));
  -- Every new account is a plain user. No auto-admin under any circumstance.
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

-- 5) Grant role — hierarchy enforced
CREATE OR REPLACE FUNCTION public.admin_grant_role(_user_id uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'grant_role', 'user', _user_id, jsonb_build_object('role',_role));
END $$;

-- 6) Revoke role — protect Super Admin, enforce hierarchy
CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_id uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'revoke_role', 'user', _user_id, jsonb_build_object('role',_role));
END $$;

-- 7) Transfer Super Admin — atomic
CREATE OR REPLACE FUNCTION public.transfer_super_admin(_to uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  -- Ensure the new super admin has the admin role too
  INSERT INTO public.user_roles(user_id, role) VALUES (_to, 'admin') ON CONFLICT DO NOTHING;
  UPDATE public.super_admins SET user_id = _to, assigned_at = now() WHERE singleton = true;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'transfer_super_admin', 'user', _to,
            jsonb_build_object('from', auth.uid(), 'to', _to));
END $$;

-- 8) Account status — protect Super Admin
CREATE OR REPLACE FUNCTION public.admin_set_account_status(
  _user_id uuid, _status text, _reason text DEFAULT NULL::text, _until timestamptz DEFAULT NULL::timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'set_status', 'user', _user_id,
            jsonb_build_object('status',_status,'reason',_reason,'until',_until));
END $$;

-- 9) VIP grant/revoke — block on Super Admin (they don't need it and shouldn't be mutated)
CREATE OR REPLACE FUNCTION public.admin_grant_vip(_user_id uuid, _days integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exp timestamptz;
BEGIN
  IF NOT (public.is_super_admin(auth.uid()) OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'ليس لديك صلاحية';
  END IF;
  _exp := now() + make_interval(days => _days);
  INSERT INTO public.vip_subscriptions(user_id, plan_code, status, started_at, expires_at)
    VALUES (_user_id, 'admin', 'active', now(), _exp);
  UPDATE public.profiles SET is_vip=true, vip_expires_at=_exp, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'grant_vip', 'user', _user_id, jsonb_build_object('days',_days));
END $$;

-- 10) Drop legacy "last admin" triggers — Super Admin is now the anchor
DROP TRIGGER IF EXISTS trg_prevent_last_admin_removal ON public.user_roles;
DROP TRIGGER IF EXISTS trg_prevent_last_admin_disable ON public.profiles;

-- 11) Protect Super Admin's profile from deletion
CREATE OR REPLACE FUNCTION public.prevent_super_admin_profile_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.super_admins WHERE user_id = OLD.id) THEN
    RAISE EXCEPTION 'لا يمكن حذف حساب المدير العام';
  END IF;
  RETURN OLD;
END $$;
DROP TRIGGER IF EXISTS trg_protect_super_admin_profile ON public.profiles;
CREATE TRIGGER trg_protect_super_admin_profile
  BEFORE DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_super_admin_profile_delete();

-- 12) Permissions on new/updated RPCs
REVOKE ALL ON FUNCTION public.admin_grant_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_revoke_role(uuid, app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_account_status(uuid, text, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_grant_vip(uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.transfer_super_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid, text, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_super_admin(uuid) TO authenticated;
