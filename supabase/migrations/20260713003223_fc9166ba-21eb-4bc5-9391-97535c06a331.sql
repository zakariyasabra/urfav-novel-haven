
-- 1) NOVELS
ALTER TABLE public.novels
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS original_title_ar text,
  ADD COLUMN IF NOT EXISTS original_title_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS author_display_ar text,
  ADD COLUMN IF NOT EXISTS author_display_en text,
  ADD COLUMN IF NOT EXISTS translator_ar text,
  ADD COLUMN IF NOT EXISTS translator_en text;

UPDATE public.novels SET
  title_ar          = COALESCE(title_ar, title),
  original_title_ar = COALESCE(original_title_ar, original_title),
  description_ar    = COALESCE(description_ar, description),
  author_display_ar = COALESCE(author_display_ar, author),
  translator_ar     = COALESCE(translator_ar, translator);

CREATE OR REPLACE FUNCTION public.sync_novel_legacy_lang()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.title          := COALESCE(NEW.title_ar, NEW.title);
  NEW.original_title := COALESCE(NEW.original_title_ar, NEW.original_title);
  NEW.description    := COALESCE(NEW.description_ar, NEW.description);
  NEW.author         := COALESCE(NEW.author_display_ar, NEW.author);
  NEW.translator     := COALESCE(NEW.translator_ar, NEW.translator);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_novels_sync_legacy ON public.novels;
CREATE TRIGGER trg_novels_sync_legacy
  BEFORE INSERT OR UPDATE ON public.novels
  FOR EACH ROW EXECUTE FUNCTION public.sync_novel_legacy_lang();

-- 2) CHAPTERS
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS content_ar text,
  ADD COLUMN IF NOT EXISTS content_en text;

UPDATE public.chapters SET
  title_ar   = COALESCE(title_ar, title),
  content_ar = COALESCE(content_ar, content);

CREATE OR REPLACE FUNCTION public.sync_chapter_legacy_lang()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.title   := COALESCE(NEW.title_ar, NEW.title);
  NEW.content := COALESCE(NEW.content_ar, NEW.content);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_chapters_sync_legacy ON public.chapters;
CREATE TRIGGER trg_chapters_sync_legacy
  BEFORE INSERT OR UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.sync_chapter_legacy_lang();

-- 3) TAGS  (name_ar already exists; only add name_en)
ALTER TABLE public.tags
  ADD COLUMN IF NOT EXISTS name_en text;

-- 4) ANNOUNCEMENTS
ALTER TABLE public.announcements
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS body_ar text,
  ADD COLUMN IF NOT EXISTS body_en text;
UPDATE public.announcements SET
  title_ar = COALESCE(title_ar, title),
  body_ar  = COALESCE(body_ar,  body);

-- 5) NOTIFICATIONS
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS body_ar text,
  ADD COLUMN IF NOT EXISTS body_en text;
UPDATE public.notifications SET
  title_ar = COALESCE(title_ar, title),
  body_ar  = COALESCE(body_ar,  body);

-- 6) VIP PLANS  (name_ar, name_en, description_ar already exist)
ALTER TABLE public.vip_plans
  ADD COLUMN IF NOT EXISTS description_en text;

-- 7) COIN PACKAGES  (no name/desc previously; add bilingual)
ALTER TABLE public.coin_packages
  ADD COLUMN IF NOT EXISTS name_ar text,
  ADD COLUMN IF NOT EXISTS name_en text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text;

-- 8) STATIC PAGES  (columns are title + body_html)
ALTER TABLE public.static_pages
  ADD COLUMN IF NOT EXISTS title_ar text,
  ADD COLUMN IF NOT EXISTS title_en text,
  ADD COLUMN IF NOT EXISTS body_html_ar text,
  ADD COLUMN IF NOT EXISTS body_html_en text;
UPDATE public.static_pages SET
  title_ar     = COALESCE(title_ar, title),
  body_html_ar = COALESCE(body_html_ar, body_html);

-- 9) FAQS
ALTER TABLE public.faqs
  ADD COLUMN IF NOT EXISTS question_ar text,
  ADD COLUMN IF NOT EXISTS question_en text,
  ADD COLUMN IF NOT EXISTS answer_ar text,
  ADD COLUMN IF NOT EXISTS answer_en text;
UPDATE public.faqs SET
  question_ar = COALESCE(question_ar, question),
  answer_ar   = COALESCE(answer_ar,   answer);

-- 10) PROFILES (author bio)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio_ar text,
  ADD COLUMN IF NOT EXISTS bio_en text;
UPDATE public.profiles SET bio_ar = COALESCE(bio_ar, bio);

-- 11) SITE SETTINGS  (value is jsonb; add language-scoped values)
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS value_ar jsonb,
  ADD COLUMN IF NOT EXISTS value_en jsonb;
UPDATE public.site_settings SET value_ar = COALESCE(value_ar, value);

-- 12) TRANSLATION CACHE
CREATE TABLE IF NOT EXISTS public.content_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  target_lang text NOT NULL CHECK (target_lang IN ('ar','en')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','error')),
  error text,
  requested_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (entity_type, entity_id, target_lang)
);

GRANT SELECT ON public.content_translations TO authenticated;
GRANT ALL    ON public.content_translations TO service_role;

ALTER TABLE public.content_translations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "translations readable by staff or owner" ON public.content_translations;
CREATE POLICY "translations readable by staff or owner"
  ON public.content_translations FOR SELECT TO authenticated
  USING (public.is_super_admin(auth.uid()) OR public.has_any_admin_role(auth.uid()) OR requested_by = auth.uid());

DROP TRIGGER IF EXISTS trg_content_translations_updated_at ON public.content_translations;
CREATE TRIGGER trg_content_translations_updated_at
  BEFORE UPDATE ON public.content_translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
