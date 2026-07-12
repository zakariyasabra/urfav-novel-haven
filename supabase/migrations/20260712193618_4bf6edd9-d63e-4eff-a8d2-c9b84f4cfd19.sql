
-- ============ PROFILES: moderation fields ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS status_reason text,
  ADD COLUMN IF NOT EXISTS suspended_until timestamptz;

-- ============ USER FOLLOWS ============
CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CHECK (follower_id <> followed_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT SELECT ON public.user_follows TO anon;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read all follows" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "self follow" ON public.user_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "self unfollow" ON public.user_follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ============ ACTIVITY FEED ============
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  ref_novel_id uuid REFERENCES public.novels(id) ON DELETE CASCADE,
  ref_chapter_id uuid REFERENCES public.chapters(id) ON DELETE CASCADE,
  ref_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_actor_created ON public.activity_feed (actor_id, created_at DESC);
GRANT SELECT ON public.activity_feed TO authenticated, anon;
GRANT ALL ON public.activity_feed TO service_role;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read activity" ON public.activity_feed FOR SELECT USING (true);

-- ============ PAYMENT METHODS (admin managed) ============
CREATE TABLE IF NOT EXISTS public.payment_methods (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  kind text NOT NULL,
  instructions text,
  account_details text,
  enabled boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read enabled methods" ON public.payment_methods FOR SELECT USING (enabled OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "admin manage methods" ON public.payment_methods FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.payment_methods (code, name_ar, kind, sort_order) VALUES
  ('paypal', 'PayPal', 'paypal', 1),
  ('usdt', 'USDT (TRC-20)', 'crypto', 2),
  ('vodafone_cash', 'فودافون كاش', 'wallet', 3),
  ('instapay', 'إنستا باي', 'wallet', 4)
ON CONFLICT (code) DO NOTHING;

-- ============ COIN PURCHASE REQUESTS ============
CREATE TABLE IF NOT EXISTS public.coin_purchase_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method_code text NOT NULL,
  coins int NOT NULL CHECK (coins > 0),
  amount_cents int NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  proof_ref text,
  proof_note text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cpr_status ON public.coin_purchase_requests (status, created_at DESC);
GRANT SELECT, INSERT ON public.coin_purchase_requests TO authenticated;
GRANT ALL ON public.coin_purchase_requests TO service_role;
ALTER TABLE public.coin_purchase_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own purchase reqs" ON public.coin_purchase_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "insert own purchase" ON public.coin_purchase_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND status='pending');
CREATE POLICY "admin manage purchases" ON public.coin_purchase_requests FOR UPDATE TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- ============ WITHDRAWAL REQUESTS ============
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coins int NOT NULL CHECK (coins > 0),
  method_code text NOT NULL,
  payout_account text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wr_status ON public.withdrawal_requests (status, created_at DESC);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own withdraw reqs" ON public.withdrawal_requests FOR SELECT TO authenticated USING (author_id = auth.uid() OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "insert own withdraw" ON public.withdrawal_requests FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND status='pending');
CREATE POLICY "admin manage withdraws" ON public.withdrawal_requests FOR UPDATE TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- ============ ADMIN RPCs ============
CREATE OR REPLACE FUNCTION public.admin_adjust_coins(_user_id uuid, _delta int, _note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _bal int;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.wallets(user_id, coins) VALUES (_user_id, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET coins = GREATEST(coins + _delta, 0), updated_at=now() WHERE user_id=_user_id RETURNING coins INTO _bal;
  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note, counterparty_id)
    VALUES (_user_id, CASE WHEN _delta >= 0 THEN 'admin_credit' ELSE 'admin_debit' END, _delta, _bal, _note, auth.uid());
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'admin_adjust_coins', 'user', _user_id, jsonb_build_object('delta',_delta,'note',_note));
  RETURN jsonb_build_object('ok',true,'balance',_bal);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_adjust_coins(uuid,int,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_adjust_coins(uuid,int,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_role(_user_id uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user_id, _role) ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'grant_role', 'user', _user_id, jsonb_build_object('role',_role));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_grant_role(uuid,app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_role(uuid,app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_role(_user_id uuid, _role app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _role='admin' AND _user_id=auth.uid() THEN RAISE EXCEPTION 'cannot revoke self admin'; END IF;
  DELETE FROM public.user_roles WHERE user_id=_user_id AND role=_role;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'revoke_role', 'user', _user_id, jsonb_build_object('role',_role));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_role(uuid,app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_role(uuid,app_role) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_account_status(_user_id uuid, _status text, _reason text DEFAULT NULL, _until timestamptz DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _status NOT IN ('active','suspended','banned') THEN RAISE EXCEPTION 'bad status'; END IF;
  UPDATE public.profiles SET account_status=_status, status_reason=_reason, suspended_until=_until, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'set_status', 'user', _user_id, jsonb_build_object('status',_status,'reason',_reason,'until',_until));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_set_account_status(uuid,text,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_account_status(uuid,text,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_vip(_user_id uuid, _days int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _exp timestamptz;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  _exp := now() + make_interval(days => _days);
  INSERT INTO public.vip_subscriptions(user_id, plan_code, status, started_at, expires_at)
    VALUES (_user_id, 'admin', 'active', now(), _exp);
  UPDATE public.profiles SET is_vip=true, vip_expires_at=_exp, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, metadata)
    VALUES (auth.uid(), 'grant_vip', 'user', _user_id, jsonb_build_object('days',_days));
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_grant_vip(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_vip(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_revoke_vip(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.vip_subscriptions SET status='cancelled' WHERE user_id=_user_id AND status='active';
  UPDATE public.profiles SET is_vip=false, vip_expires_at=NULL, updated_at=now() WHERE id=_user_id;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id) VALUES (auth.uid(),'revoke_vip','user',_user_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_revoke_vip(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_revoke_vip(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_coin_purchase(_req_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid; _coins int; _bal int;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT user_id, coins INTO _uid, _coins FROM public.coin_purchase_requests WHERE id=_req_id AND status='pending' FOR UPDATE;
  IF _uid IS NULL THEN RAISE EXCEPTION 'not found or already processed'; END IF;
  INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT (user_id) DO NOTHING;
  UPDATE public.wallets SET coins = coins + _coins, updated_at=now() WHERE user_id=_uid RETURNING coins INTO _bal;
  INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
    VALUES (_uid, 'purchase', _coins, _bal, 'coin purchase #'||_req_id);
  UPDATE public.coin_purchase_requests SET status='approved', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_req_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_uid, 'purchase_approved', 'تم إيداع عملاتك', _coins||' عملة', '/wallet');
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id) VALUES (auth.uid(),'approve_coin_purchase','coin_purchase_request',_req_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_approve_coin_purchase(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_coin_purchase(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_coin_purchase(_req_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.coin_purchase_requests SET status='rejected', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now()
    WHERE id=_req_id AND status='pending' RETURNING user_id INTO _uid;
  IF _uid IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_uid, 'purchase_rejected', 'تم رفض طلب الشراء', COALESCE(_note,'راجع التفاصيل'), '/wallet');
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id) VALUES (auth.uid(),'reject_coin_purchase','coin_purchase_request',_req_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_reject_coin_purchase(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_coin_purchase(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_withdrawal(_coins int, _method text, _account text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _pending int; _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _coins < 100 THEN RAISE EXCEPTION 'minimum 100 coins'; END IF;
  SELECT coins_pending INTO _pending FROM public.author_earnings WHERE author_id=_uid FOR UPDATE;
  IF _pending IS NULL OR _pending < _coins THEN RAISE EXCEPTION 'insufficient pending earnings'; END IF;
  UPDATE public.author_earnings SET coins_pending = coins_pending - _coins, updated_at=now() WHERE author_id=_uid;
  INSERT INTO public.withdrawal_requests(author_id, coins, method_code, payout_account)
    VALUES (_uid, _coins, _method, _account) RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(int,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(int,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_approve_withdrawal(_req_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid; _coins int;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT author_id, coins INTO _uid, _coins FROM public.withdrawal_requests WHERE id=_req_id AND status='pending' FOR UPDATE;
  IF _uid IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.author_earnings SET coins_paid_out = coins_paid_out + _coins, updated_at=now() WHERE author_id=_uid;
  UPDATE public.withdrawal_requests SET status='approved', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_req_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_uid, 'withdrawal_approved', 'تمت الموافقة على سحب أرباحك', _coins||' عملة', '/author');
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id) VALUES (auth.uid(),'approve_withdrawal','withdrawal_request',_req_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_approve_withdrawal(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_reject_withdrawal(_req_id uuid, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid; _coins int;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT author_id, coins INTO _uid, _coins FROM public.withdrawal_requests WHERE id=_req_id AND status='pending' FOR UPDATE;
  IF _uid IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  UPDATE public.author_earnings SET coins_pending = coins_pending + _coins, updated_at=now() WHERE author_id=_uid;
  UPDATE public.withdrawal_requests SET status='rejected', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=_req_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_uid, 'withdrawal_rejected', 'تم رفض طلب السحب', COALESCE(_note,''), '/author');
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id) VALUES (auth.uid(),'reject_withdrawal','withdrawal_request',_req_id);
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reject_withdrawal(uuid,text) TO authenticated;

-- ============ SEARCH TRENDING VIEW ============
CREATE OR REPLACE VIEW public.search_trending AS
SELECT lower(trim(query)) AS query, count(*)::int AS hits, max(created_at) AS last_seen
FROM public.search_history
WHERE created_at > now() - interval '7 days' AND length(trim(query)) >= 2
GROUP BY lower(trim(query))
ORDER BY hits DESC
LIMIT 50;
GRANT SELECT ON public.search_trending TO anon, authenticated;

-- ============ ENSURE handle_new_user never auto-grants Author ============
-- (existing function already assigns only 'user' or first-account 'admin' — reaffirm defensively.)
