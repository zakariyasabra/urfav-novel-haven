
-- profiles: spoiler preference
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS allow_spoilers boolean NOT NULL DEFAULT false;

-- collections extensions
ALTER TABLE public.collections
  ADD COLUMN IF NOT EXISTS cover_url text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS smart_key text,
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_collaborative boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS novels_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followers_count integer NOT NULL DEFAULT 0;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collections_kind_chk') THEN
    ALTER TABLE public.collections
      ADD CONSTRAINT collections_kind_chk CHECK (kind IN ('custom','smart_continue','smart_completed','smart_favorites','smart_read_later','smart_dropped'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS collections_slug_uniq ON public.collections (slug) WHERE slug IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS collections_user_smart_uniq ON public.collections (user_id, smart_key) WHERE smart_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS collections_user_position_idx ON public.collections (user_id, position);

CREATE OR REPLACE FUNCTION public._collections_gen_slug()
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE candidate text; tries int := 0;
BEGIN
  LOOP
    candidate := regexp_replace(lower(substr(encode(gen_random_bytes(6),'base64'),1,8)),'[^a-z0-9]','','g');
    IF length(candidate) < 6 THEN candidate := candidate || substr(md5(random()::text),1,6); END IF;
    candidate := substr(candidate,1,8);
    IF NOT EXISTS (SELECT 1 FROM public.collections WHERE slug = candidate) THEN RETURN candidate; END IF;
    tries := tries + 1;
    IF tries > 8 THEN RETURN candidate || substr(md5(random()::text),1,4); END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION public._collections_gen_slug() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._collections_set_slug()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.slug IS NULL OR length(NEW.slug) = 0 THEN NEW.slug := public._collections_gen_slug(); END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_collections_slug ON public.collections;
CREATE TRIGGER trg_collections_slug BEFORE INSERT ON public.collections
FOR EACH ROW EXECUTE FUNCTION public._collections_set_slug();

UPDATE public.collections SET slug = public._collections_gen_slug() WHERE slug IS NULL;

-- collection_items
ALTER TABLE public.collection_items
  ADD COLUMN IF NOT EXISTS position integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note text,
  ADD COLUMN IF NOT EXISTS added_by uuid;

CREATE INDEX IF NOT EXISTS collection_items_position_idx ON public.collection_items (collection_id, position);

-- Stats trigger for novels_count
CREATE OR REPLACE FUNCTION public._collections_bump_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections SET novels_count = novels_count + 1, updated_at = now() WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections SET novels_count = GREATEST(novels_count - 1, 0), updated_at = now() WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_collection_items_count ON public.collection_items;
CREATE TRIGGER trg_collection_items_count
AFTER INSERT OR DELETE ON public.collection_items
FOR EACH ROW EXECUTE FUNCTION public._collections_bump_count();

UPDATE public.collections c SET novels_count = (SELECT count(*) FROM public.collection_items ci WHERE ci.collection_id = c.id);

-- collection_collaborators
CREATE TABLE IF NOT EXISTS public.collection_collaborators (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('editor','viewer')),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collection_collaborators TO authenticated;
GRANT ALL ON public.collection_collaborators TO service_role;
ALTER TABLE public.collection_collaborators ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "collab read" ON public.collection_collaborators;
CREATE POLICY "collab read" ON public.collection_collaborators
  FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));

DROP POLICY IF EXISTS "collab manage by owner" ON public.collection_collaborators;
CREATE POLICY "collab manage by owner" ON public.collection_collaborators
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.collections c WHERE c.id = collection_id AND c.user_id = auth.uid()));

-- collection_follows
CREATE TABLE IF NOT EXISTS public.collection_follows (
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  followed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (collection_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.collection_follows TO authenticated;
GRANT ALL ON public.collection_follows TO service_role;
ALTER TABLE public.collection_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follow read own" ON public.collection_follows;
CREATE POLICY "follow read own" ON public.collection_follows FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "follow insert self" ON public.collection_follows;
CREATE POLICY "follow insert self" ON public.collection_follows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "follow delete self" ON public.collection_follows;
CREATE POLICY "follow delete self" ON public.collection_follows FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public._collections_bump_followers()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.collections SET followers_count = followers_count + 1 WHERE id = NEW.collection_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.collections SET followers_count = GREATEST(followers_count - 1, 0) WHERE id = OLD.collection_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_collection_follows_count ON public.collection_follows;
CREATE TRIGGER trg_collection_follows_count
AFTER INSERT OR DELETE ON public.collection_follows
FOR EACH ROW EXECUTE FUNCTION public._collections_bump_followers();

-- collaborator RLS additions on collections + items
DROP POLICY IF EXISTS "collab can read collection" ON public.collections;
CREATE POLICY "collab can read collection" ON public.collections
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collection_collaborators cc WHERE cc.collection_id = id AND cc.user_id = auth.uid()));

DROP POLICY IF EXISTS "collab editors can insert items" ON public.collection_items;
CREATE POLICY "collab editors can insert items" ON public.collection_items
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.collection_collaborators cc
    JOIN public.collections c ON c.id = cc.collection_id
    WHERE cc.collection_id = collection_items.collection_id
      AND cc.user_id = auth.uid() AND cc.role = 'editor' AND c.is_collaborative = true
  ));

DROP POLICY IF EXISTS "collab can read items" ON public.collection_items;
CREATE POLICY "collab can read items" ON public.collection_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.collection_collaborators cc WHERE cc.collection_id = collection_items.collection_id AND cc.user_id = auth.uid()));

-- Smart collections RPC (avoiding reserved word "position")
CREATE OR REPLACE FUNCTION public.smart_collection_novels(_kind text, _limit int DEFAULT 100)
RETURNS TABLE(novel_id uuid, rn bigint, added_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RETURN; END IF;
  IF _kind = 'smart_continue' THEN
    RETURN QUERY SELECT rh.novel_id, row_number() OVER (ORDER BY rh.updated_at DESC), rh.updated_at
      FROM public.reading_history rh
      WHERE rh.user_id = uid AND COALESCE(rh.progress_percent,0) < 100
      ORDER BY rh.updated_at DESC LIMIT _limit;
  ELSIF _kind = 'smart_completed' THEN
    RETURN QUERY SELECT rh.novel_id, row_number() OVER (ORDER BY rh.updated_at DESC), rh.updated_at
      FROM public.reading_history rh
      WHERE rh.user_id = uid AND COALESCE(rh.progress_percent,0) >= 100
      ORDER BY rh.updated_at DESC LIMIT _limit;
  ELSIF _kind = 'smart_favorites' THEN
    RETURN QUERY SELECT f.novel_id, row_number() OVER (ORDER BY f.created_at DESC), f.created_at
      FROM public.favorites f WHERE f.user_id = uid ORDER BY f.created_at DESC LIMIT _limit;
  ELSIF _kind = 'smart_read_later' THEN
    RETURN QUERY SELECT b.novel_id, row_number() OVER (ORDER BY b.created_at DESC), b.created_at
      FROM public.bookmarks b WHERE b.user_id = uid ORDER BY b.created_at DESC LIMIT _limit;
  ELSIF _kind = 'smart_dropped' THEN
    RETURN QUERY SELECT rh.novel_id, row_number() OVER (ORDER BY rh.updated_at DESC), rh.updated_at
      FROM public.reading_history rh
      WHERE rh.user_id = uid
        AND rh.updated_at < now() - interval '60 days'
        AND COALESCE(rh.progress_percent,0) BETWEEN 1 AND 90
      ORDER BY rh.updated_at DESC LIMIT _limit;
  ELSE RETURN;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.smart_collection_novels(text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.smart_collection_novels(text,int) TO authenticated;

-- Collection view bump
CREATE OR REPLACE FUNCTION public.collection_bump_view(_collection_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.collections SET views_count = views_count + 1
  WHERE id = _collection_id AND (is_public = true OR user_id = auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.collection_bump_view(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.collection_bump_view(uuid) TO anon, authenticated;

-- Spoiler-aware AI context primitive
CREATE OR REPLACE FUNCTION public.ai_reader_context(_novel_id uuid)
RETURNS TABLE(
  allow_spoilers boolean,
  last_chapter_index integer,
  last_chapter_id uuid,
  progress_percent numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN QUERY SELECT false, 0, NULL::uuid, 0::numeric;
    RETURN;
  END IF;
  RETURN QUERY
  SELECT
    COALESCE(p.allow_spoilers,false),
    COALESCE(ch.chapter_number,0)::int,
    rh.last_chapter_id,
    COALESCE(rh.progress_percent,0)::numeric
  FROM public.profiles p
  LEFT JOIN public.reading_history rh ON rh.user_id = p.id AND rh.novel_id = _novel_id
  LEFT JOIN public.chapters ch ON ch.id = rh.last_chapter_id
  WHERE p.id = uid LIMIT 1;
END $$;
REVOKE ALL ON FUNCTION public.ai_reader_context(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_reader_context(uuid) TO authenticated;
