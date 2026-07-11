
-- Extend comments for spoiler + text-selection quoting
ALTER TABLE public.comments
  ADD COLUMN IF NOT EXISTS is_spoiler boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS selection_text text,
  ADD COLUMN IF NOT EXISTS selection_hash text;

CREATE INDEX IF NOT EXISTS idx_comments_selection ON public.comments(chapter_id, selection_hash) WHERE selection_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id) WHERE parent_id IS NOT NULL;

-- Emoji reactions on a text selection inside a chapter
CREATE TABLE IF NOT EXISTS public.text_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  selection_hash text NOT NULL,
  selection_text text NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chapter_id, selection_hash, emoji)
);

GRANT SELECT ON public.text_reactions TO anon;
GRANT SELECT, INSERT, DELETE ON public.text_reactions TO authenticated;
GRANT ALL ON public.text_reactions TO service_role;
ALTER TABLE public.text_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "text_reactions_public_read" ON public.text_reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "text_reactions_insert_own" ON public.text_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "text_reactions_delete_own" ON public.text_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_text_reactions_chapter ON public.text_reactions(chapter_id, selection_hash);

-- Reviews: extend ratings with title + body
ALTER TABLE public.ratings
  ADD COLUMN IF NOT EXISTS review_title text,
  ADD COLUMN IF NOT EXISTS review_body text,
  ADD COLUMN IF NOT EXISTS likes_count integer NOT NULL DEFAULT 0;

-- Likes on reviews (rating rows)
CREATE TABLE IF NOT EXISTS public.review_likes (
  rating_id uuid NOT NULL REFERENCES public.ratings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rating_id, user_id)
);

GRANT SELECT ON public.review_likes TO anon;
GRANT SELECT, INSERT, DELETE ON public.review_likes TO authenticated;
GRANT ALL ON public.review_likes TO service_role;
ALTER TABLE public.review_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_likes_public_read" ON public.review_likes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "review_likes_insert_own" ON public.review_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_likes_delete_own" ON public.review_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Recompute likes_count on ratings via trigger
CREATE OR REPLACE FUNCTION public.recompute_review_likes()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE rid uuid;
BEGIN
  rid := COALESCE(NEW.rating_id, OLD.rating_id);
  UPDATE public.ratings SET likes_count = (SELECT COUNT(*) FROM public.review_likes WHERE rating_id = rid) WHERE id = rid;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_review_likes ON public.review_likes;
CREATE TRIGGER trg_review_likes
AFTER INSERT OR DELETE ON public.review_likes
FOR EACH ROW EXECUTE FUNCTION public.recompute_review_likes();
