
-- ─────────────────────────────────────────────────────────────
-- Batch 7G — Creator Studio
-- ─────────────────────────────────────────────────────────────

-- 1. Chapter version history ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chapter_versions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id   uuid NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  version_no   integer NOT NULL,
  title_ar     text,
  title_en     text,
  content_ar   text,
  content_en   text,
  editor_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  note         text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (chapter_id, version_no)
);

GRANT SELECT ON public.chapter_versions TO authenticated;
GRANT ALL    ON public.chapter_versions TO service_role;

ALTER TABLE public.chapter_versions ENABLE ROW LEVEL SECURITY;

-- Owners (or admins) can read versions of their chapters
CREATE POLICY "chapter_versions_owner_read"
ON public.chapter_versions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.chapters c
    JOIN public.novels   n ON n.id = c.novel_id
    WHERE c.id = chapter_versions.chapter_id
      AND (n.owner_id = auth.uid() OR public.has_any_admin_role(auth.uid()))
  )
);

CREATE INDEX IF NOT EXISTS idx_chapter_versions_chapter
  ON public.chapter_versions (chapter_id, version_no DESC);

-- Snapshot trigger: fires when title/content changes
CREATE OR REPLACE FUNCTION public.tg_chapters_snapshot_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_no int;
BEGIN
  IF TG_OP = 'UPDATE' AND (
    COALESCE(NEW.title_ar,'')    IS DISTINCT FROM COALESCE(OLD.title_ar,'')    OR
    COALESCE(NEW.title_en,'')    IS DISTINCT FROM COALESCE(OLD.title_en,'')    OR
    COALESCE(NEW.title,'')       IS DISTINCT FROM COALESCE(OLD.title,'')       OR
    COALESCE(NEW.content_ar,'')  IS DISTINCT FROM COALESCE(OLD.content_ar,'')  OR
    COALESCE(NEW.content_en,'')  IS DISTINCT FROM COALESCE(OLD.content_en,'')  OR
    COALESCE(NEW.content,'')     IS DISTINCT FROM COALESCE(OLD.content,'')
  ) THEN
    SELECT COALESCE(MAX(version_no), 0) + 1 INTO next_no
      FROM public.chapter_versions WHERE chapter_id = OLD.id;

    INSERT INTO public.chapter_versions
      (chapter_id, version_no, title_ar, title_en, content_ar, content_en, editor_id, note)
    VALUES
      (OLD.id, next_no,
       COALESCE(OLD.title_ar, OLD.title),
       OLD.title_en,
       COALESCE(OLD.content_ar, OLD.content),
       OLD.content_en,
       auth.uid(),
       'auto-snapshot');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_chapters_snapshot_version ON public.chapters;
CREATE TRIGGER tg_chapters_snapshot_version
BEFORE UPDATE ON public.chapters
FOR EACH ROW EXECUTE FUNCTION public.tg_chapters_snapshot_version();

-- 2. Optional reader country (for Top Countries) ─────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text;
CREATE INDEX IF NOT EXISTS idx_profiles_country ON public.profiles (country_code)
  WHERE country_code IS NOT NULL;

-- 3. Helper indexes for creator analytics ───────────────────
CREATE INDEX IF NOT EXISTS idx_reading_history_novel_time
  ON public.reading_history (novel_id, last_read_at DESC);
CREATE INDEX IF NOT EXISTS idx_reading_history_user_novel
  ON public.reading_history (user_id, novel_id);
CREATE INDEX IF NOT EXISTS idx_chapters_owner_schedule
  ON public.chapters (novel_id, scheduled_at)
  WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_chapters_owner_published
  ON public.chapters (novel_id, published_at DESC)
  WHERE published_at IS NOT NULL;

-- 4. Owner check helper ─────────────────────────────────────
CREATE OR REPLACE FUNCTION public.is_novel_author(_novel_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.novels
    WHERE id = _novel_id
      AND (owner_id = _uid OR public.has_any_admin_role(_uid))
  );
$$;
REVOKE ALL ON FUNCTION public.is_novel_author(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_novel_author(uuid,uuid) TO authenticated, service_role;

-- 5. Creator KPIs (rolls-up existing signals) ────────────────
CREATE OR REPLACE FUNCTION public.creator_kpis()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  WITH my_novels AS (
    SELECT id, is_published FROM public.novels WHERE owner_id = uid
  ),
  ch AS (
    SELECT c.id, c.status, c.published_at
    FROM public.chapters c JOIN my_novels n ON n.id = c.novel_id
  ),
  rh AS (
    SELECT user_id, last_read_at FROM public.reading_history
    WHERE novel_id IN (SELECT id FROM my_novels)
  ),
  fav AS (SELECT 1 FROM public.favorites WHERE novel_id IN (SELECT id FROM my_novels)),
  fol AS (SELECT 1 FROM public.author_follows WHERE author_id = uid),
  earn AS (
    SELECT COALESCE(SUM(amount),0)::bigint AS coins
    FROM public.author_earnings WHERE author_id = uid
  ),
  earn_30 AS (
    SELECT COALESCE(SUM(amount),0)::bigint AS coins
    FROM public.author_earnings
    WHERE author_id = uid AND created_at >= now() - INTERVAL '30 days'
  ),
  rated AS (
    SELECT COALESCE(AVG(rating),0)::numeric AS avg_rating, COUNT(*)::bigint AS cnt
    FROM public.ratings WHERE novel_id IN (SELECT id FROM my_novels)
  ),
  views AS (
    SELECT COALESCE(SUM(views_count),0)::bigint AS v
    FROM public.novels WHERE owner_id = uid
  )
  SELECT jsonb_build_object(
    'novels_total',      (SELECT count(*) FROM my_novels),
    'novels_published',  (SELECT count(*) FROM my_novels WHERE is_published),
    'chapters_total',    (SELECT count(*) FROM ch),
    'chapters_published',(SELECT count(*) FROM ch WHERE status='published'),
    'chapters_scheduled',(SELECT count(*) FROM ch WHERE status='scheduled'),
    'chapters_draft',    (SELECT count(*) FROM ch WHERE status='draft'),
    'unique_readers',    (SELECT count(DISTINCT user_id) FROM rh),
    'reads_7d',          (SELECT count(*) FROM rh WHERE last_read_at >= now() - INTERVAL '7 days'),
    'reads_30d',         (SELECT count(*) FROM rh WHERE last_read_at >= now() - INTERVAL '30 days'),
    'favorites',         (SELECT count(*) FROM fav),
    'followers',         (SELECT count(*) FROM fol),
    'views_total',       (SELECT v FROM views),
    'rating_avg',        (SELECT round(avg_rating::numeric, 2) FROM rated),
    'rating_count',      (SELECT cnt FROM rated),
    'coins_lifetime',    (SELECT coins FROM earn),
    'coins_30d',         (SELECT coins FROM earn_30)
  ) INTO result;

  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.creator_kpis() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_kpis() TO authenticated;

-- 6. Growth timeseries ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.creator_growth_timeseries(_days int DEFAULT 30)
RETURNS TABLE(day date, reads bigint, new_favorites bigint, new_followers bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH my_novels AS (SELECT id FROM public.novels WHERE owner_id = auth.uid()),
  d AS (
    SELECT generate_series(
      (now() - make_interval(days => GREATEST(_days,1) - 1))::date,
      now()::date, INTERVAL '1 day')::date AS day
  ),
  rh AS (
    SELECT last_read_at::date AS day, count(*) AS reads
    FROM public.reading_history
    WHERE novel_id IN (SELECT id FROM my_novels)
      AND last_read_at >= now() - make_interval(days => _days)
    GROUP BY 1
  ),
  fv AS (
    SELECT created_at::date AS day, count(*) AS c
    FROM public.favorites
    WHERE novel_id IN (SELECT id FROM my_novels)
      AND created_at >= now() - make_interval(days => _days)
    GROUP BY 1
  ),
  fo AS (
    SELECT created_at::date AS day, count(*) AS c
    FROM public.author_follows
    WHERE author_id = auth.uid()
      AND created_at >= now() - make_interval(days => _days)
    GROUP BY 1
  )
  SELECT d.day,
         COALESCE(rh.reads,0)::bigint,
         COALESCE(fv.c,0)::bigint,
         COALESCE(fo.c,0)::bigint
  FROM d
  LEFT JOIN rh USING (day)
  LEFT JOIN fv USING (day)
  LEFT JOIN fo USING (day)
  ORDER BY d.day;
$$;
REVOKE ALL ON FUNCTION public.creator_growth_timeseries(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_growth_timeseries(int) TO authenticated;

-- 7. Reading heatmap (dow × hour, last N days) ──────────────
CREATE OR REPLACE FUNCTION public.creator_reading_heatmap(_novel_id uuid, _days int DEFAULT 30)
RETURNS TABLE(dow int, hour int, reads bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXTRACT(DOW  FROM last_read_at)::int AS dow,
         EXTRACT(HOUR FROM last_read_at)::int AS hour,
         count(*)::bigint AS reads
  FROM public.reading_history
  WHERE last_read_at >= now() - make_interval(days => _days)
    AND (
      _novel_id IS NULL
        AND novel_id IN (SELECT id FROM public.novels WHERE owner_id = auth.uid())
      OR
      _novel_id IS NOT NULL
        AND novel_id = _novel_id
        AND public.is_novel_author(_novel_id, auth.uid())
    )
  GROUP BY 1,2;
$$;
REVOKE ALL ON FUNCTION public.creator_reading_heatmap(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_reading_heatmap(uuid,int) TO authenticated;

-- 8. Top readers (per novel or across catalog) ──────────────
CREATE OR REPLACE FUNCTION public.creator_top_readers(
  _novel_id uuid DEFAULT NULL, _limit int DEFAULT 10, _days int DEFAULT 90
)
RETURNS TABLE(
  user_id uuid, username text, display_name text, avatar_url text,
  is_vip boolean, chapters_read bigint, last_read_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scope AS (
    SELECT rh.user_id, rh.chapter_id, rh.last_read_at
    FROM public.reading_history rh
    WHERE rh.last_read_at >= now() - make_interval(days => _days)
      AND (
        _novel_id IS NULL
          AND rh.novel_id IN (SELECT id FROM public.novels WHERE owner_id = auth.uid())
        OR
        _novel_id IS NOT NULL
          AND rh.novel_id = _novel_id
          AND public.is_novel_author(_novel_id, auth.uid())
      )
  )
  SELECT s.user_id,
         p.username, p.display_name, p.avatar_url, p.is_vip,
         count(DISTINCT s.chapter_id)::bigint AS chapters_read,
         max(s.last_read_at) AS last_read_at
  FROM scope s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  GROUP BY s.user_id, p.username, p.display_name, p.avatar_url, p.is_vip
  ORDER BY chapters_read DESC, last_read_at DESC
  LIMIT GREATEST(_limit,1);
$$;
REVOKE ALL ON FUNCTION public.creator_top_readers(uuid,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_top_readers(uuid,int,int) TO authenticated;

-- 9. Top countries ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.creator_top_countries(
  _novel_id uuid DEFAULT NULL, _limit int DEFAULT 10, _days int DEFAULT 90
)
RETURNS TABLE(country_code text, readers bigint, reads bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scope AS (
    SELECT rh.user_id, rh.last_read_at
    FROM public.reading_history rh
    WHERE rh.last_read_at >= now() - make_interval(days => _days)
      AND (
        _novel_id IS NULL
          AND rh.novel_id IN (SELECT id FROM public.novels WHERE owner_id = auth.uid())
        OR
        _novel_id IS NOT NULL
          AND rh.novel_id = _novel_id
          AND public.is_novel_author(_novel_id, auth.uid())
      )
  )
  SELECT COALESCE(p.country_code,'--') AS country_code,
         count(DISTINCT s.user_id)::bigint AS readers,
         count(*)::bigint AS reads
  FROM scope s
  LEFT JOIN public.profiles p ON p.id = s.user_id
  GROUP BY 1
  ORDER BY readers DESC, reads DESC
  LIMIT GREATEST(_limit,1);
$$;
REVOKE ALL ON FUNCTION public.creator_top_countries(uuid,int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_top_countries(uuid,int,int) TO authenticated;

-- 10. Reading sources breakdown ─────────────────────────────
-- Categorises reads into: free / vip / coin_unlock, using chapter attrs + unlocks table.
CREATE OR REPLACE FUNCTION public.creator_reading_sources(
  _novel_id uuid DEFAULT NULL, _days int DEFAULT 30
)
RETURNS TABLE(source text, reads bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH scope AS (
    SELECT rh.user_id, rh.chapter_id, rh.last_read_at
    FROM public.reading_history rh
    WHERE rh.last_read_at >= now() - make_interval(days => _days)
      AND (
        _novel_id IS NULL
          AND rh.novel_id IN (SELECT id FROM public.novels WHERE owner_id = auth.uid())
        OR
        _novel_id IS NOT NULL
          AND rh.novel_id = _novel_id
          AND public.is_novel_author(_novel_id, auth.uid())
      )
  ),
  classified AS (
    SELECT
      CASE
        WHEN cu.user_id IS NOT NULL THEN 'coin_unlock'
        WHEN c.is_vip                THEN 'vip'
        ELSE 'free'
      END AS source
    FROM scope s
    JOIN public.chapters c ON c.id = s.chapter_id
    LEFT JOIN public.chapter_unlocks cu
      ON cu.chapter_id = s.chapter_id AND cu.user_id = s.user_id
  )
  SELECT source, count(*)::bigint FROM classified GROUP BY source ORDER BY 2 DESC;
$$;
REVOKE ALL ON FUNCTION public.creator_reading_sources(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_reading_sources(uuid,int) TO authenticated;

-- 11. Completion rates per novel ────────────────────────────
CREATE OR REPLACE FUNCTION public.creator_completion_rates(_novel_id uuid DEFAULT NULL)
RETURNS TABLE(
  novel_id uuid, title text, slug text,
  total_readers bigint, finished_readers bigint,
  completion_pct numeric, avg_progress numeric
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH my_novels AS (
    SELECT id, title, slug FROM public.novels
    WHERE owner_id = auth.uid()
      AND (_novel_id IS NULL OR id = _novel_id)
  ),
  last_ch AS (
    SELECT c.novel_id, c.id AS chapter_id, c.chapter_number
    FROM public.chapters c
    JOIN my_novels n ON n.id = c.novel_id
    WHERE c.status = 'published'
    AND c.chapter_number = (
      SELECT max(chapter_number) FROM public.chapters
      WHERE novel_id = c.novel_id AND status='published'
    )
  ),
  reads AS (
    SELECT rh.novel_id, rh.user_id,
           max(rh.progress) AS max_progress,
           bool_or(rh.chapter_id = lc.chapter_id AND rh.progress >= 90) AS finished
    FROM public.reading_history rh
    JOIN my_novels n ON n.id = rh.novel_id
    LEFT JOIN last_ch lc ON lc.novel_id = rh.novel_id
    GROUP BY rh.novel_id, rh.user_id
  )
  SELECT n.id, n.title, n.slug,
         COALESCE(count(r.user_id),0)::bigint AS total_readers,
         COALESCE(count(r.user_id) FILTER (WHERE r.finished),0)::bigint AS finished_readers,
         CASE WHEN count(r.user_id) > 0
              THEN round(100.0 * count(r.user_id) FILTER (WHERE r.finished) / count(r.user_id), 2)
              ELSE 0 END AS completion_pct,
         COALESCE(round(avg(r.max_progress)::numeric, 2), 0) AS avg_progress
  FROM my_novels n
  LEFT JOIN reads r ON r.novel_id = n.id
  GROUP BY n.id, n.title, n.slug
  ORDER BY total_readers DESC;
$$;
REVOKE ALL ON FUNCTION public.creator_completion_rates(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_completion_rates(uuid) TO authenticated;

-- 12. Publishing calendar (past N + upcoming M days) ────────
CREATE OR REPLACE FUNCTION public.creator_publishing_calendar(
  _days_back int DEFAULT 30, _days_forward int DEFAULT 30
)
RETURNS TABLE(
  chapter_id uuid, novel_id uuid, novel_title text, novel_slug text,
  chapter_number int, title text, status text,
  scheduled_at timestamptz, published_at timestamptz, is_vip boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT c.id, n.id, n.title, n.slug,
         c.chapter_number,
         COALESCE(c.title_ar, c.title) AS title,
         c.status::text,
         c.scheduled_at, c.published_at, c.is_vip
  FROM public.chapters c
  JOIN public.novels n ON n.id = c.novel_id
  WHERE n.owner_id = auth.uid()
    AND (
      (c.published_at IS NOT NULL AND c.published_at >= now() - make_interval(days => _days_back))
      OR
      (c.scheduled_at IS NOT NULL AND c.scheduled_at <= now() + make_interval(days => _days_forward))
      OR
      c.status = 'draft'
    )
  ORDER BY COALESCE(c.scheduled_at, c.published_at, c.updated_at) DESC;
$$;
REVOKE ALL ON FUNCTION public.creator_publishing_calendar(int,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_publishing_calendar(int,int) TO authenticated;

-- 13. Chapter versions list + restore ───────────────────────
CREATE OR REPLACE FUNCTION public.creator_chapter_versions(_chapter_id uuid)
RETURNS TABLE(
  id uuid, version_no int, note text,
  editor_id uuid, editor_name text,
  created_at timestamptz,
  title_ar text, title_en text,
  content_len_ar int, content_len_en int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT v.id, v.version_no, v.note, v.editor_id,
         p.display_name,
         v.created_at,
         v.title_ar, v.title_en,
         COALESCE(length(v.content_ar),0),
         COALESCE(length(v.content_en),0)
  FROM public.chapter_versions v
  LEFT JOIN public.profiles p ON p.id = v.editor_id
  WHERE v.chapter_id = _chapter_id
    AND EXISTS (
      SELECT 1 FROM public.chapters c
      JOIN public.novels n ON n.id = c.novel_id
      WHERE c.id = _chapter_id
        AND (n.owner_id = auth.uid() OR public.has_any_admin_role(auth.uid()))
    )
  ORDER BY v.version_no DESC;
$$;
REVOKE ALL ON FUNCTION public.creator_chapter_versions(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_chapter_versions(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.creator_restore_chapter_version(_version_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v public.chapter_versions%ROWTYPE;
  can_edit boolean;
BEGIN
  SELECT * INTO v FROM public.chapter_versions WHERE id = _version_id;
  IF v.id IS NULL THEN RAISE EXCEPTION 'Version not found'; END IF;

  SELECT (n.owner_id = auth.uid() OR public.has_any_admin_role(auth.uid()))
    INTO can_edit
  FROM public.chapters c JOIN public.novels n ON n.id = c.novel_id
  WHERE c.id = v.chapter_id;

  IF NOT COALESCE(can_edit,false) THEN RAISE EXCEPTION 'Not authorised'; END IF;

  UPDATE public.chapters SET
    title_ar   = COALESCE(v.title_ar, title_ar),
    title_en   = COALESCE(v.title_en, title_en),
    title      = COALESCE(v.title_ar, title),
    content_ar = COALESCE(v.content_ar, content_ar),
    content_en = COALESCE(v.content_en, content_en),
    content    = COALESCE(v.content_ar, content),
    updated_at = now()
  WHERE id = v.chapter_id;

  RETURN v.chapter_id;
END; $$;
REVOKE ALL ON FUNCTION public.creator_restore_chapter_version(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_restore_chapter_version(uuid) TO authenticated;
