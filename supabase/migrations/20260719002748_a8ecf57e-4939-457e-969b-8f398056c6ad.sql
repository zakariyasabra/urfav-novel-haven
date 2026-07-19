
DO $$ BEGIN
  CREATE TYPE public.rec_feedback_type AS ENUM ('like','hide','not_interested','already_read');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  feedback rec_feedback_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, novel_id, feedback)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recommendation_feedback TO authenticated;
GRANT ALL ON public.recommendation_feedback TO service_role;
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_feedback_select" ON public.recommendation_feedback;
DROP POLICY IF EXISTS "own_feedback_insert" ON public.recommendation_feedback;
DROP POLICY IF EXISTS "own_feedback_delete" ON public.recommendation_feedback;
CREATE POLICY "own_feedback_select" ON public.recommendation_feedback FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own_feedback_insert" ON public.recommendation_feedback FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_feedback_delete" ON public.recommendation_feedback FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_rec_feedback_user ON public.recommendation_feedback(user_id, feedback);

CREATE OR REPLACE FUNCTION public._rec_excluded_novels(p_user uuid)
RETURNS TABLE(novel_id uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT novel_id FROM public.recommendation_feedback
  WHERE user_id = p_user AND feedback IN ('hide','not_interested','already_read')
$$;
REVOKE ALL ON FUNCTION public._rec_excluded_novels(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.rec_trending_today(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH excl AS (SELECT novel_id FROM public._rec_excluded_novels(auth.uid()))
  SELECT rh.novel_id, count(*)::numeric, 'rec.reason.trendingToday'::text,
         jsonb_build_object('readers', count(DISTINCT rh.user_id))
  FROM public.reading_history rh
  JOIN public.novels n ON n.id = rh.novel_id AND n.is_published = true
  WHERE rh.last_read_at > now() - interval '24 hours'
    AND rh.novel_id NOT IN (SELECT novel_id FROM excl)
  GROUP BY rh.novel_id
  ORDER BY count(*) DESC
  LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_trending_today(int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rec_popular_week(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH excl AS (SELECT novel_id FROM public._rec_excluded_novels(auth.uid()))
  SELECT rh.novel_id, count(*)::numeric, 'rec.reason.popularWeek',
         jsonb_build_object('readers', count(DISTINCT rh.user_id))
  FROM public.reading_history rh
  JOIN public.novels n ON n.id = rh.novel_id AND n.is_published = true
  WHERE rh.last_read_at > now() - interval '7 days'
    AND rh.novel_id NOT IN (SELECT novel_id FROM excl)
  GROUP BY rh.novel_id
  ORDER BY count(*) DESC
  LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_popular_week(int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rec_hidden_gems(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH excl AS (SELECT novel_id FROM public._rec_excluded_novels(auth.uid()))
  SELECT n.id, (n.rating_avg * ln(GREATEST(n.rating_count,1)+1))::numeric,
         'rec.reason.hiddenGem', jsonb_build_object('rating', round(n.rating_avg::numeric, 1))
  FROM public.novels n
  WHERE n.is_published = true AND n.rating_avg >= 4.2 AND n.rating_count >= 3
    AND n.views_count < 5000
    AND n.id NOT IN (SELECT novel_id FROM excl)
  ORDER BY 2 DESC
  LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_hidden_gems(int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rec_recently_updated(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH excl AS (SELECT novel_id FROM public._rec_excluded_novels(auth.uid())),
  latest AS (
    SELECT c.novel_id, max(coalesce(c.published_at, c.created_at)) AS newest
    FROM public.chapters c
    WHERE c.status = 'published' AND coalesce(c.published_at, c.created_at) <= now()
    GROUP BY c.novel_id
  )
  SELECT l.novel_id, extract(epoch FROM l.newest)::numeric,
         'rec.reason.recentlyUpdated', jsonb_build_object('when', l.newest)
  FROM latest l
  JOIN public.novels n ON n.id = l.novel_id AND n.is_published = true
  WHERE l.novel_id NOT IN (SELECT novel_id FROM excl)
  ORDER BY l.newest DESC
  LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_recently_updated(int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rec_because_you_read(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() u),
  excl AS (SELECT novel_id FROM public._rec_excluded_novels((SELECT u FROM me))),
  read_novels AS (SELECT DISTINCT novel_id FROM public.reading_history WHERE user_id = (SELECT u FROM me)),
  fav_genres AS (
    SELECT ng.genre_id, count(*) AS c
    FROM read_novels r JOIN public.novel_genres ng ON ng.novel_id = r.novel_id
    GROUP BY ng.genre_id ORDER BY c DESC LIMIT 5
  ),
  candidates AS (
    SELECT n.id AS novel_id, sum(fg.c)::numeric AS score,
           (array_agg(g.name_ar ORDER BY fg.c DESC))[1] AS top_genre_ar,
           (array_agg(g.name_en ORDER BY fg.c DESC))[1] AS top_genre_en
    FROM public.novels n
    JOIN public.novel_genres ng ON ng.novel_id = n.id
    JOIN fav_genres fg ON fg.genre_id = ng.genre_id
    LEFT JOIN public.genres g ON g.id = fg.genre_id
    WHERE n.is_published = true
      AND n.id NOT IN (SELECT novel_id FROM read_novels)
      AND n.id NOT IN (SELECT novel_id FROM excl)
    GROUP BY n.id
  )
  SELECT novel_id, score, 'rec.reason.becauseYouRead',
         jsonb_build_object('genre_ar', top_genre_ar, 'genre_en', top_genre_en)
  FROM candidates ORDER BY score DESC LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_because_you_read(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.rec_from_followed_authors(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() u),
  excl AS (SELECT novel_id FROM public._rec_excluded_novels((SELECT u FROM me))),
  read_novels AS (SELECT DISTINCT novel_id FROM public.reading_history WHERE user_id = (SELECT u FROM me))
  SELECT n.id, extract(epoch FROM n.created_at)::numeric,
         'rec.reason.fromFollowedAuthor', jsonb_build_object('author', n.author)
  FROM public.author_follows af
  JOIN public.novels n ON n.owner_id = af.author_id
  WHERE af.follower_id = (SELECT u FROM me) AND n.is_published = true
    AND n.id NOT IN (SELECT novel_id FROM read_novels)
    AND n.id NOT IN (SELECT novel_id FROM excl)
  ORDER BY n.created_at DESC
  LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_from_followed_authors(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.rec_readers_like_you(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH me AS (SELECT auth.uid() u),
  excl AS (SELECT novel_id FROM public._rec_excluded_novels((SELECT u FROM me))),
  my_novels AS (
    SELECT novel_id FROM public.favorites WHERE user_id = (SELECT u FROM me)
    UNION SELECT novel_id FROM public.reading_history WHERE user_id = (SELECT u FROM me)
  ),
  similar_users AS (
    SELECT f.user_id, count(*) AS overlap
    FROM public.favorites f JOIN my_novels m ON m.novel_id = f.novel_id
    WHERE f.user_id <> (SELECT u FROM me)
    GROUP BY f.user_id ORDER BY overlap DESC LIMIT 40
  ),
  candidates AS (
    SELECT f.novel_id, sum(su.overlap)::numeric AS score, count(DISTINCT f.user_id) AS n_users
    FROM similar_users su
    JOIN public.favorites f ON f.user_id = su.user_id
    JOIN public.novels n ON n.id = f.novel_id AND n.is_published = true
    WHERE f.novel_id NOT IN (SELECT novel_id FROM my_novels)
      AND f.novel_id NOT IN (SELECT novel_id FROM excl)
    GROUP BY f.novel_id
  )
  SELECT novel_id, score, 'rec.reason.readersLikeYou', jsonb_build_object('users', n_users)
  FROM candidates ORDER BY score DESC LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_readers_like_you(int) TO authenticated;

CREATE OR REPLACE FUNCTION public.rec_more_like_this(p_novel_id uuid, p_limit int DEFAULT 8)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH src_genres AS (SELECT genre_id FROM public.novel_genres WHERE novel_id = p_novel_id),
  src_tags AS (SELECT tag_id FROM public.novel_tags WHERE novel_id = p_novel_id),
  excl AS (SELECT novel_id FROM public._rec_excluded_novels(auth.uid())),
  cand AS (
    SELECT n.id,
           (SELECT count(*) FROM public.novel_genres ng WHERE ng.novel_id = n.id AND ng.genre_id IN (SELECT genre_id FROM src_genres))::numeric AS g_ovl,
           (SELECT count(*) FROM public.novel_tags nt WHERE nt.novel_id = n.id AND nt.tag_id IN (SELECT tag_id FROM src_tags))::numeric AS t_ovl
    FROM public.novels n
    WHERE n.id <> p_novel_id AND n.is_published = true
      AND n.id NOT IN (SELECT novel_id FROM excl)
  )
  SELECT id, (g_ovl * 2 + t_ovl), 'rec.reason.moreLikeThis',
         jsonb_build_object('shared_genres', g_ovl, 'shared_tags', t_ovl)
  FROM cand WHERE (g_ovl + t_ovl) > 0
  ORDER BY 2 DESC, id LIMIT LEAST(p_limit, 30);
$$;
GRANT EXECUTE ON FUNCTION public.rec_more_like_this(uuid, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.rec_for_you(p_limit int DEFAULT 12)
RETURNS TABLE(novel_id uuid, score numeric, reason_key text, reason_params jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH parts AS (
    SELECT novel_id, score * 3.0 AS s, reason_key, reason_params FROM public.rec_because_you_read(30)
    UNION ALL SELECT novel_id, score * 2.0, reason_key, reason_params FROM public.rec_readers_like_you(30)
    UNION ALL SELECT novel_id, score * 1.5, reason_key, reason_params FROM public.rec_from_followed_authors(30)
    UNION ALL SELECT novel_id, score * 0.5, reason_key, reason_params FROM public.rec_trending_today(30)
  ),
  agg AS (
    SELECT novel_id, sum(s) AS score,
           (array_agg(reason_key ORDER BY s DESC))[1] AS reason_key,
           (array_agg(reason_params ORDER BY s DESC))[1] AS reason_params
    FROM parts GROUP BY novel_id
  )
  SELECT novel_id, score, reason_key, reason_params FROM agg
  ORDER BY score DESC LIMIT LEAST(p_limit, 50);
$$;
GRANT EXECUTE ON FUNCTION public.rec_for_you(int) TO authenticated;
