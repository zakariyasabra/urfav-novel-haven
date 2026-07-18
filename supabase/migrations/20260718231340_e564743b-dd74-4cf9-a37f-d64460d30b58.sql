
-- ============ Extend daily_missions with rich metadata ============
ALTER TABLE public.daily_missions
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'easy',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'reading';

-- ============ Extend weekly_challenges with rich metadata ============
ALTER TABLE public.weekly_challenges
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'reading';

-- Seed a couple of default weekly challenges if empty
INSERT INTO public.weekly_challenges (title_ar, title_en, target_kind, target_value, xp, coins, category, difficulty, icon, description_ar)
SELECT * FROM (VALUES
  ('اقرأ 100 فصل هذا الأسبوع', 'Read 100 chapters this week', 'read_chapter', 100, 500, 100, 'reading', 'hard', '📚', 'تحدٍ أسبوعي كبير للقراء الشرهين'),
  ('قيّم 5 روايات', 'Rate 5 novels', 'rate_novel', 5, 200, 40, 'community', 'medium', '⭐', 'ساهم بتقييماتك لمساعدة القراء'),
  ('اكتب 20 تعليقاً', 'Post 20 comments', 'comment', 20, 250, 50, 'social', 'medium', '💬', 'شارك في النقاشات المجتمعية')
) AS v(title_ar, title_en, target_kind, target_value, xp, coins, category, difficulty, icon, description_ar)
WHERE NOT EXISTS (SELECT 1 FROM public.weekly_challenges);

-- Backfill mission descriptions/icons for previously-seeded rows
UPDATE public.daily_missions SET icon = '📖', description_ar = 'اقرأ 5 فصول لتكسب مكافأتك اليومية' WHERE code='read5' AND icon IS NULL;
UPDATE public.daily_missions SET icon = '💬', description_ar = 'اكتب تعليقاً مفيداً' WHERE code='comment1' AND icon IS NULL;
UPDATE public.daily_missions SET icon = '⭐', description_ar = 'قيّم رواية أعجبتك' WHERE code='rate1' AND icon IS NULL;
UPDATE public.daily_missions SET icon = '🔗', description_ar = 'شارك رواية مع أصدقائك' WHERE code='share1' AND icon IS NULL;
UPDATE public.daily_missions SET icon = '✨', description_ar = 'سجّل دخولك اليومي', category='login' WHERE code='login1' AND icon IS NULL;

-- ============ RPC: gm_my_challenges (weekly) ============
CREATE OR REPLACE FUNCTION public.gm_my_challenges()
RETURNS TABLE(
  id uuid, title_ar text, title_en text, description_ar text, description_en text,
  icon text, difficulty text, category text,
  target_kind text, target_value int, xp int, coins int,
  starts_at timestamptz, ends_at timestamptz,
  progress int, completed boolean, claimed boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT c.id, c.title_ar, c.title_en, c.description_ar, c.description_en,
         c.icon, c.difficulty, c.category,
         c.target_kind, c.target_value, c.xp, c.coins,
         c.starts_at, c.ends_at,
         COALESCE(u.progress,0), COALESCE(u.completed,false), COALESCE(u.claimed,false)
  FROM public.weekly_challenges c
  LEFT JOIN public.user_weekly_challenges u ON u.challenge_id=c.id AND u.user_id=_uid
  WHERE c.enabled AND c.ends_at > now() AND c.starts_at <= now()
  ORDER BY c.ends_at ASC;
END $$;
REVOKE ALL ON FUNCTION public.gm_my_challenges() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_my_challenges() TO authenticated;

-- ============ RPC: gm_activity_feed (self + followed users) ============
CREATE OR REPLACE FUNCTION public.gm_activity_feed(_limit int DEFAULT 30, _before timestamptz DEFAULT NULL)
RETURNS TABLE(
  id uuid, actor_id uuid, actor_username text, actor_display_name text, actor_avatar_url text,
  kind text, ref_novel_id uuid, ref_chapter_id uuid, ref_user_id uuid,
  meta jsonb, created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  IF _limit IS NULL OR _limit < 1 OR _limit > 100 THEN _limit := 30; END IF;
  RETURN QUERY
  SELECT a.id, a.actor_id, p.username, p.display_name, p.avatar_url,
         a.kind, a.ref_novel_id, a.ref_chapter_id, a.ref_user_id, a.meta, a.created_at
  FROM public.activity_feed a
  LEFT JOIN public.profiles p ON p.id = a.actor_id
  WHERE (
    a.actor_id = _uid
    OR EXISTS (SELECT 1 FROM public.user_follows uf WHERE uf.follower_id = _uid AND uf.followed_id = a.actor_id)
  )
  AND (_before IS NULL OR a.created_at < _before)
  ORDER BY a.created_at DESC
  LIMIT _limit;
END $$;
REVOKE ALL ON FUNCTION public.gm_activity_feed(int, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_activity_feed(int, timestamptz) TO authenticated;

-- ============ RPC: gm_user_rank (visible reading rank) ============
CREATE OR REPLACE FUNCTION public.gm_user_rank(_user uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := COALESCE(_user, auth.uid());
  _xp bigint := 0;
  _ach int := 0;
  _chapters int := 0;
  _tier text := 'bronze';
  _tier_ar text := 'برونزي';
  _next_tier text := 'silver';
  _next_at bigint := 500;
  _score bigint := 0;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT COALESCE(total_xp,0) INTO _xp FROM public.user_xp WHERE user_id=_uid;
  SELECT count(*)::int INTO _ach FROM public.user_achievements WHERE user_id=_uid;
  SELECT COALESCE(total_chapters_read,0)::int INTO _chapters FROM public.reading_stats WHERE user_id=_uid;

  -- Composite score: XP + achievements*100 + chapters*10
  _score := COALESCE(_xp,0) + (_ach * 100) + (_chapters * 10);

  IF _score >= 100000 THEN _tier := 'immortal'; _tier_ar := 'خالد';    _next_tier := NULL;        _next_at := 0;
  ELSIF _score >= 50000 THEN _tier := 'legend';   _tier_ar := 'أسطورة'; _next_tier := 'immortal';  _next_at := 100000;
  ELSIF _score >= 20000 THEN _tier := 'master';   _tier_ar := 'محترف';  _next_tier := 'legend';    _next_at := 50000;
  ELSIF _score >= 8000  THEN _tier := 'diamond';  _tier_ar := 'ماسي';   _next_tier := 'master';    _next_at := 20000;
  ELSIF _score >= 3000  THEN _tier := 'gold';     _tier_ar := 'ذهبي';   _next_tier := 'diamond';   _next_at := 8000;
  ELSIF _score >= 1000  THEN _tier := 'silver';   _tier_ar := 'فضّي';   _next_tier := 'gold';      _next_at := 3000;
  ELSE                     _tier := 'bronze';   _tier_ar := 'برونزي'; _next_tier := 'silver';    _next_at := 1000;
  END IF;

  RETURN jsonb_build_object(
    'tier', _tier, 'tier_ar', _tier_ar,
    'score', _score, 'xp', _xp, 'achievements', _ach, 'chapters', _chapters,
    'next_tier', _next_tier, 'next_at', _next_at
  );
END $$;
REVOKE ALL ON FUNCTION public.gm_user_rank(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_user_rank(uuid) TO authenticated;

-- ============ Expanded leaderboard supporting more metrics ============
CREATE OR REPLACE FUNCTION public.gm_leaderboard(_metric text DEFAULT 'xp', _period text DEFAULT 'all_time', _limit int DEFAULT 50)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, score bigint, rank int)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _limit IS NULL OR _limit < 1 OR _limit > 200 THEN _limit := 50; END IF;

  IF _metric = 'chapters' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COALESCE(rs.total_chapters_read,0)::bigint,
           (row_number() OVER (ORDER BY COALESCE(rs.total_chapters_read,0) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.reading_stats rs ON rs.user_id = p.id
    WHERE COALESCE(rs.total_chapters_read,0) > 0
    ORDER BY COALESCE(rs.total_chapters_read,0) DESC LIMIT _limit;
    RETURN;
  ELSIF _metric = 'minutes' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COALESCE(rs.total_minutes,0)::bigint,
           (row_number() OVER (ORDER BY COALESCE(rs.total_minutes,0) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.reading_stats rs ON rs.user_id = p.id
    WHERE COALESCE(rs.total_minutes,0) > 0
    ORDER BY COALESCE(rs.total_minutes,0) DESC LIMIT _limit;
    RETURN;
  ELSIF _metric = 'completed' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COALESCE(rs.completed_novels,0)::bigint,
           (row_number() OVER (ORDER BY COALESCE(rs.completed_novels,0) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.reading_stats rs ON rs.user_id = p.id
    WHERE COALESCE(rs.completed_novels,0) > 0
    ORDER BY COALESCE(rs.completed_novels,0) DESC LIMIT _limit;
    RETURN;
  ELSIF _metric = 'achievements' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COUNT(ua.*)::bigint,
           (row_number() OVER (ORDER BY COUNT(ua.*) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.user_achievements ua ON ua.user_id = p.id
    GROUP BY p.id, p.username, p.display_name, p.avatar_url
    HAVING COUNT(ua.*) > 0
    ORDER BY COUNT(ua.*) DESC LIMIT _limit;
    RETURN;
  ELSIF _metric = 'streak' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COALESCE(rst.current_streak,0)::bigint,
           (row_number() OVER (ORDER BY COALESCE(rst.current_streak,0) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.reading_streaks rst ON rst.user_id = p.id
    WHERE COALESCE(rst.current_streak,0) > 0
    ORDER BY COALESCE(rst.current_streak,0) DESC LIMIT _limit;
    RETURN;
  END IF;

  -- Falls back to original xp / coins / weekly / monthly behavior
  IF _period = 'all_time' AND _metric = 'xp' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COALESCE(u.total_xp,0)::bigint,
           (row_number() OVER (ORDER BY COALESCE(u.total_xp,0) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.user_xp u ON u.user_id = p.id
    WHERE COALESCE(u.total_xp,0) > 0
    ORDER BY COALESCE(u.total_xp,0) DESC LIMIT _limit;
  ELSIF _period = 'all_time' AND _metric = 'coins' THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COALESCE(w.coins,0)::bigint,
           (row_number() OVER (ORDER BY COALESCE(w.coins,0) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.wallets w ON w.user_id = p.id
    WHERE COALESCE(w.coins,0) > 0
    ORDER BY COALESCE(w.coins,0) DESC LIMIT _limit;
  ELSIF _period IN ('weekly','monthly') THEN
    RETURN QUERY
    SELECT p.id, p.username, p.display_name, p.avatar_url,
           COALESCE(sum(e.xp),0)::bigint AS score,
           (row_number() OVER (ORDER BY COALESCE(sum(e.xp),0) DESC))::int
    FROM public.profiles p
    LEFT JOIN public.xp_events e ON e.user_id = p.id
       AND e.created_at >= CASE WHEN _period='weekly' THEN date_trunc('week', now()) ELSE date_trunc('month', now()) END
    GROUP BY p.id, p.username, p.display_name, p.avatar_url
    HAVING COALESCE(sum(e.xp),0) > 0
    ORDER BY score DESC LIMIT _limit;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.gm_leaderboard(text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gm_leaderboard(text, text, int) TO authenticated, anon;

-- ============ Notify on mission completion ============
CREATE OR REPLACE FUNCTION public._gm_notify_mission_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM true) THEN
    SELECT title_ar INTO _title FROM public.daily_missions WHERE code = NEW.mission_code;
    INSERT INTO public.notifications(user_id, kind, title, body, meta)
    VALUES (NEW.user_id, 'mission_complete', 'اكتملت مهمة يومية',
            COALESCE(_title,'') || ' — اضغط للاستلام',
            jsonb_build_object('mission_code', NEW.mission_code));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gm_notify_mission_complete ON public.user_daily_missions;
CREATE TRIGGER trg_gm_notify_mission_complete
AFTER UPDATE ON public.user_daily_missions
FOR EACH ROW EXECUTE FUNCTION public._gm_notify_mission_complete();

-- ============ Notify on weekly challenge completion ============
CREATE OR REPLACE FUNCTION public._gm_notify_challenge_complete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _title text;
BEGIN
  IF NEW.completed = true AND (OLD.completed IS DISTINCT FROM true) THEN
    SELECT title_ar INTO _title FROM public.weekly_challenges WHERE id = NEW.challenge_id;
    INSERT INTO public.notifications(user_id, kind, title, body, meta)
    VALUES (NEW.user_id, 'challenge_complete', 'اكتمل تحدٍ أسبوعي!',
            COALESCE(_title,'') || ' — اضغط للاستلام',
            jsonb_build_object('challenge_id', NEW.challenge_id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gm_notify_challenge_complete ON public.user_weekly_challenges;
CREATE TRIGGER trg_gm_notify_challenge_complete
AFTER UPDATE ON public.user_weekly_challenges
FOR EACH ROW EXECUTE FUNCTION public._gm_notify_challenge_complete();
