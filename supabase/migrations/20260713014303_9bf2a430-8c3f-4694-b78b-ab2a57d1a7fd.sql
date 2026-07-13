-- =========================
-- Support Tickets
-- =========================
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'bug','suggestion','feature','translation','novel','chapter',
    'payment','account','copyright','abuse','other'
  )),
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','assigned','in_progress','waiting_user','resolved','closed','rejected'
  )),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb, -- url, browser, os, device, screen, lang, theme, screenshot_url
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tickets_owner_read" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "tickets_owner_insert" ON public.support_tickets
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "tickets_admin_update" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_tickets_user ON public.support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.support_tickets(status, priority, created_at DESC);

CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ticket replies (user-visible thread + internal admin notes)
CREATE TABLE IF NOT EXISTS public.support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.support_ticket_messages TO authenticated;
GRANT ALL ON public.support_ticket_messages TO service_role;
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ticket_msg_read" ON public.support_ticket_messages
  FOR SELECT TO authenticated
  USING (
    (
      NOT is_internal
      AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid())
    )
    OR public.has_any_admin_role(auth.uid())
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "ticket_msg_insert" ON public.support_ticket_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND (
      (is_internal = false AND EXISTS (SELECT 1 FROM public.support_tickets t WHERE t.id = ticket_id AND t.user_id = auth.uid()))
      OR public.has_any_admin_role(auth.uid())
      OR public.is_super_admin(auth.uid())
    )
  );

CREATE INDEX IF NOT EXISTS idx_ticket_msg ON public.support_ticket_messages(ticket_id, created_at);

-- =========================
-- Feature Requests
-- =========================
CREATE TABLE IF NOT EXISTS public.feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN (
    'submitted','planned','accepted','in_progress','completed','rejected'
  )),
  admin_note TEXT,
  votes_count INT NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.feature_requests TO authenticated;
GRANT SELECT ON public.feature_requests TO anon;
GRANT ALL ON public.feature_requests TO service_role;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fr_public_read" ON public.feature_requests
  FOR SELECT TO anon, authenticated
  USING (is_public = true OR user_id = auth.uid() OR public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()));
CREATE POLICY "fr_owner_insert" ON public.feature_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "fr_admin_update" ON public.feature_requests
  FOR UPDATE TO authenticated
  USING (public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()) OR public.is_super_admin(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_fr_status ON public.feature_requests(status, votes_count DESC, created_at DESC);

CREATE TRIGGER trg_fr_updated BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.feature_request_votes (
  request_id UUID NOT NULL REFERENCES public.feature_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.feature_request_votes TO authenticated;
GRANT ALL ON public.feature_request_votes TO service_role;
ALTER TABLE public.feature_request_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frv_read" ON public.feature_request_votes
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "frv_own_write" ON public.feature_request_votes
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "frv_own_delete" ON public.feature_request_votes
  FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.recompute_fr_votes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE rid uuid;
BEGIN
  rid := COALESCE(NEW.request_id, OLD.request_id);
  UPDATE public.feature_requests
    SET votes_count = (SELECT COUNT(*) FROM public.feature_request_votes WHERE request_id = rid)
    WHERE id = rid;
  RETURN NULL;
END $$;

CREATE TRIGGER trg_frv_count
AFTER INSERT OR DELETE ON public.feature_request_votes
FOR EACH ROW EXECUTE FUNCTION public.recompute_fr_votes();

-- =========================
-- Admin broadcast to all users' notifications
-- =========================
CREATE OR REPLACE FUNCTION public.admin_broadcast_notification(
  _title text, _body text, _link text DEFAULT NULL, _type text DEFAULT 'announcement'
) RETURNS int
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
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
  INSERT INTO public.audit_logs(actor_id, action, target_type, metadata)
    VALUES (auth.uid(), 'broadcast', 'notification', jsonb_build_object('count',_n,'title',_title));
  RETURN _n;
END $$;

REVOKE ALL ON FUNCTION public.admin_broadcast_notification(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_broadcast_notification(text,text,text,text) TO authenticated;

-- Notify admins on new ticket + new feature request
CREATE OR REPLACE FUNCTION public.notify_admins_new_ticket()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications(user_id, type, title, body, link)
    SELECT ur.user_id, 'ticket_new', 'تذكرة دعم جديدة', NEW.subject, '/admin?tab=support'
      FROM public.user_roles ur
      WHERE ur.role IN ('admin','moderator');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_admins_ticket
AFTER INSERT ON public.support_tickets
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_new_ticket();

CREATE OR REPLACE FUNCTION public.notify_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _owner uuid;
BEGIN
  IF NEW.is_internal THEN RETURN NEW; END IF;
  SELECT user_id INTO _owner FROM public.support_tickets WHERE id = NEW.ticket_id;
  IF _owner IS NOT NULL AND _owner <> NEW.author_id THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (_owner, 'ticket_reply', 'رد جديد على تذكرتك', left(NEW.body, 140), '/support/' || NEW.ticket_id::text);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_notify_ticket_reply
AFTER INSERT ON public.support_ticket_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_ticket_reply();
