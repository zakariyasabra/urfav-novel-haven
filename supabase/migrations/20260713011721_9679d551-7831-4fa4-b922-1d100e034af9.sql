
-- Public read of translation status (safe: just entity + status metadata; no PII)
DROP POLICY IF EXISTS "translations status public read" ON public.content_translations;
CREATE POLICY "translations status public read"
  ON public.content_translations FOR SELECT
  TO anon, authenticated
  USING (true);
GRANT SELECT ON public.content_translations TO anon;

-- Trigger: when Arabic novel content changes, mark English translation outdated (pending)
CREATE OR REPLACE FUNCTION public.mark_novel_translation_outdated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       COALESCE(NEW.title_ar,'') IS DISTINCT FROM COALESCE(OLD.title_ar,'')
    OR COALESCE(NEW.description_ar,'') IS DISTINCT FROM COALESCE(OLD.description_ar,'')
    OR COALESCE(NEW.author_display_ar,'') IS DISTINCT FROM COALESCE(OLD.author_display_ar,'')
    OR COALESCE(NEW.original_title_ar,'') IS DISTINCT FROM COALESCE(OLD.original_title_ar,'')
    OR COALESCE(NEW.translator_ar,'') IS DISTINCT FROM COALESCE(OLD.translator_ar,'')
  ) THEN
    INSERT INTO public.content_translations(entity_type, entity_id, target_lang, status, error)
      VALUES ('novel', NEW.id, 'en', 'pending', 'outdated')
    ON CONFLICT (entity_type, entity_id, target_lang)
    DO UPDATE SET status='pending', error='outdated', updated_at=now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mark_novel_translation_outdated ON public.novels;
CREATE TRIGGER trg_mark_novel_translation_outdated
  AFTER UPDATE ON public.novels
  FOR EACH ROW EXECUTE FUNCTION public.mark_novel_translation_outdated();

CREATE OR REPLACE FUNCTION public.mark_chapter_translation_outdated()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (
       COALESCE(NEW.title_ar,'') IS DISTINCT FROM COALESCE(OLD.title_ar,'')
    OR COALESCE(NEW.content_ar,'') IS DISTINCT FROM COALESCE(OLD.content_ar,'')
  ) THEN
    INSERT INTO public.content_translations(entity_type, entity_id, target_lang, status, error)
      VALUES ('chapter', NEW.id, 'en', 'pending', 'outdated')
    ON CONFLICT (entity_type, entity_id, target_lang)
    DO UPDATE SET status='pending', error='outdated', updated_at=now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mark_chapter_translation_outdated ON public.chapters;
CREATE TRIGGER trg_mark_chapter_translation_outdated
  AFTER UPDATE ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public.mark_chapter_translation_outdated();
