
-- ============================================================
-- AUTHOR APPLICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.author_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pen_name text NOT NULL,
  bio text NOT NULL,
  sample_work text,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  admin_note text,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.author_applications TO authenticated;
GRANT ALL ON public.author_applications TO service_role;
ALTER TABLE public.author_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own applications select" ON public.author_applications
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "own applications insert" ON public.author_applications
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "admins manage applications" ON public.author_applications
  FOR UPDATE TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TRIGGER trg_author_applications_updated
  BEFORE UPDATE ON public.author_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- PROFILES: add author bio + social links
-- ============================================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS author_bio text;

-- ============================================================
-- NOVELS: ownership + publish flag
-- ============================================================
ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_novels_owner ON public.novels(owner_id);
CREATE INDEX IF NOT EXISTS idx_novels_published ON public.novels(is_published);

-- Authors can manage their own novels; admins can manage any.
DROP POLICY IF EXISTS "authors manage own novels" ON public.novels;
CREATE POLICY "authors manage own novels" ON public.novels
  FOR ALL TO authenticated
  USING (owner_id = auth.uid() AND public.has_role(auth.uid(),'author'))
  WITH CHECK (owner_id = auth.uid() AND public.has_role(auth.uid(),'author'));

DROP POLICY IF EXISTS "authors read own unpublished novels" ON public.novels;
CREATE POLICY "authors read own unpublished novels" ON public.novels
  FOR SELECT TO authenticated USING (owner_id = auth.uid());

-- ============================================================
-- CHAPTERS: draft / scheduled / published
-- ============================================================
DO $$ BEGIN
  CREATE TYPE public.chapter_status AS ENUM ('draft','scheduled','published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS status public.chapter_status NOT NULL DEFAULT 'published',
  ADD COLUMN IF NOT EXISTS scheduled_at timestamptz,
  ADD COLUMN IF NOT EXISTS published_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_chapters_status ON public.chapters(status);
CREATE INDEX IF NOT EXISTS idx_chapters_scheduled ON public.chapters(scheduled_at) WHERE status = 'scheduled';

-- Authors manage chapters of their own novels
DROP POLICY IF EXISTS "authors manage own chapters" ON public.chapters;
CREATE POLICY "authors manage own chapters" ON public.chapters
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.owner_id = auth.uid() AND public.has_role(auth.uid(),'author')))
  WITH CHECK (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.owner_id = auth.uid() AND public.has_role(auth.uid(),'author')));

-- ============================================================
-- TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name_ar text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tags TO anon, authenticated;
GRANT ALL ON public.tags TO service_role;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tags public read" ON public.tags FOR SELECT USING (true);
CREATE POLICY "admins manage tags" ON public.tags FOR ALL TO authenticated
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.novel_tags (
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (novel_id, tag_id)
);
GRANT SELECT ON public.novel_tags TO anon, authenticated;
GRANT INSERT, DELETE ON public.novel_tags TO authenticated;
GRANT ALL ON public.novel_tags TO service_role;
ALTER TABLE public.novel_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "novel_tags public read" ON public.novel_tags FOR SELECT USING (true);
CREATE POLICY "authors manage own novel tags" ON public.novel_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_tags.novel_id AND (n.owner_id = auth.uid() OR public.has_any_admin_role(auth.uid()))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_tags.novel_id AND (n.owner_id = auth.uid() OR public.has_any_admin_role(auth.uid()))));

-- ============================================================
-- AUTHOR FOLLOWS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.author_follows (
  follower_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, author_id)
);
GRANT SELECT ON public.author_follows TO anon, authenticated;
GRANT INSERT, DELETE ON public.author_follows TO authenticated;
GRANT ALL ON public.author_follows TO service_role;
ALTER TABLE public.author_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows public counts" ON public.author_follows FOR SELECT USING (true);
CREATE POLICY "own follow insert" ON public.author_follows FOR INSERT TO authenticated
  WITH CHECK (follower_id = auth.uid());
CREATE POLICY "own follow delete" ON public.author_follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid());

-- ============================================================
-- READING PROGRESS (continue reading, autosave scroll)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reading_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  scroll_pct numeric(5,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, novel_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_progress TO authenticated;
GRANT ALL ON public.reading_progress TO service_role;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reading progress" ON public.reading_progress FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============================================================
-- NOTIFICATIONS: add type column
-- ============================================================
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read, created_at DESC);

-- ============================================================
-- HELPERS
-- ============================================================
-- Approve an author application: sets status, grants role, notifies user.
CREATE OR REPLACE FUNCTION public.approve_author_application(_app_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.author_applications
     SET status='approved', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now()
   WHERE id=_app_id RETURNING user_id INTO _user;
  IF _user IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (_user, 'author')
    ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_user, 'author_approved', 'تمت الموافقة على طلبك ككاتب', 'يمكنك الآن نشر رواياتك من لوحة الكاتب.', '/author');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.approve_author_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_author_application(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_author_application(_app_id uuid, _note text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _user uuid;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  UPDATE public.author_applications
     SET status='rejected', admin_note=_note, reviewed_by=auth.uid(), reviewed_at=now()
   WHERE id=_app_id RETURNING user_id INTO _user;
  IF _user IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_user, 'author_rejected', 'تم رفض طلبك', COALESCE(_note,'يمكنك تقديم طلب جديد لاحقاً.'), '/author/apply');
END;
$$;
REVOKE EXECUTE ON FUNCTION public.reject_author_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_author_application(uuid, text) TO authenticated;

-- Publish scheduled chapters whose time has come (called by pg_cron or app).
CREATE OR REPLACE FUNCTION public.publish_due_chapters()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE cnt int;
BEGIN
  WITH upd AS (
    UPDATE public.chapters SET status='published', published_at=now()
     WHERE status='scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now()
    RETURNING 1
  )
  SELECT count(*) INTO cnt FROM upd;
  RETURN cnt;
END $$;
REVOKE EXECUTE ON FUNCTION public.publish_due_chapters() FROM PUBLIC, anon, authenticated;
