
-- 1. Extend achievements
ALTER TABLE public.achievements
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'reading',
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS hidden boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS achievements_category_idx ON public.achievements(category) WHERE enabled;

-- 2. Extend badges
ALTER TABLE public.badges
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS animation text,
  ADD COLUMN IF NOT EXISTS description_ar text,
  ADD COLUMN IF NOT EXISTS description_en text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Backfill description_ar from legacy `description` column
UPDATE public.badges SET description_ar = description WHERE description_ar IS NULL AND description IS NOT NULL;

-- 3. Extend reading_stats
ALTER TABLE public.reading_stats
  ADD COLUMN IF NOT EXISTS completed_novels integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS words_read bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS longest_session_min integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sessions_count integer NOT NULL DEFAULT 0;

-- 4. Reading stats RPC (own data only)
CREATE OR REPLACE FUNCTION public.gm_reading_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  stats record;
  streak record;
  cal jsonb;
  monthly jsonb;
  fav_novel record;
  fav_author text;
  fav_genre record;
  novels_read int;
BEGIN
  IF uid IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO stats FROM public.reading_stats WHERE user_id = uid;
  SELECT * INTO streak FROM public.reading_streaks WHERE user_id = uid;

  -- 90-day calendar from xp_events for reading codes
  SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d, 'count', c) ORDER BY d), '[]'::jsonb) INTO cal
  FROM (
    SELECT day AS d, count(*)::int AS c
    FROM public.xp_events
    WHERE user_id = uid
      AND code IN ('read_chapter','daily_login')
      AND day >= (current_date - INTERVAL '89 days')
    GROUP BY day
  ) t;

  -- 12-month history
  SELECT COALESCE(jsonb_agg(jsonb_build_object('month', m, 'count', c) ORDER BY m), '[]'::jsonb) INTO monthly
  FROM (
    SELECT to_char(date_trunc('month', day), 'YYYY-MM') AS m, count(*)::int AS c
    FROM public.xp_events
    WHERE user_id = uid
      AND code = 'read_chapter'
      AND day >= (current_date - INTERVAL '11 months')
    GROUP BY 1
  ) t;

  -- Novels touched
  SELECT count(DISTINCT novel_id)::int INTO novels_read FROM public.reading_history WHERE user_id = uid;

  -- Favorite novel (most-recent read among most-viewed)
  SELECT n.id, n.slug, COALESCE(n.title_ar, n.title) AS title, n.cover_url
    INTO fav_novel
  FROM public.reading_history h
  JOIN public.novels n ON n.id = h.novel_id
  WHERE h.user_id = uid
  ORDER BY h.last_read_at DESC
  LIMIT 1;

  -- Favorite author (most-read author across history)
  SELECT n.author INTO fav_author
  FROM public.reading_history h
  JOIN public.novels n ON n.id = h.novel_id
  WHERE h.user_id = uid
  GROUP BY n.author
  ORDER BY count(*) DESC
  LIMIT 1;

  -- Favorite genre
  SELECT g.id, COALESCE(g.name, g.slug) AS name INTO fav_genre
  FROM public.reading_history h
  JOIN public.novel_genres ng ON ng.novel_id = h.novel_id
  JOIN public.genres g ON g.id = ng.genre_id
  WHERE h.user_id = uid
  GROUP BY g.id, g.name, g.slug
  ORDER BY count(*) DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'total_chapters_read', COALESCE(stats.total_chapters_read, 0),
    'total_minutes', COALESCE(stats.total_minutes, 0),
    'words_read', COALESCE(stats.words_read, 0),
    'sessions_count', COALESCE(stats.sessions_count, 0),
    'longest_session_min', COALESCE(stats.longest_session_min, 0),
    'completed_novels', COALESCE(stats.completed_novels, 0),
    'novels_read', COALESCE(novels_read, 0),
    'current_streak', COALESCE(streak.current_streak, 0),
    'longest_streak', COALESCE(streak.longest_streak, 0),
    'calendar', cal,
    'monthly', monthly,
    'favorite_novel', CASE WHEN fav_novel.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', fav_novel.id, 'slug', fav_novel.slug, 'title', fav_novel.title, 'cover_url', fav_novel.cover_url) END,
    'favorite_author', fav_author,
    'favorite_genre', CASE WHEN fav_genre.id IS NULL THEN NULL ELSE jsonb_build_object(
        'id', fav_genre.id, 'name', fav_genre.name) END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.gm_reading_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_reading_stats() TO authenticated;

-- 5. Achievement progress RPC
CREATE OR REPLACE FUNCTION public.gm_achievement_progress()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  result jsonb := '[]'::jsonb;
  a record;
  progress int;
  chapters_read int; comments_c int; reviews_c int; streak_c int;
  referrals_c int; level_c int; coins_earned_c int; novels_pub_c int; novels_completed_c int;
  favorites_c int; ratings_c int;
BEGIN
  IF uid IS NULL THEN RETURN result; END IF;

  SELECT COALESCE(total_chapters_read,0), COALESCE(completed_novels,0) INTO chapters_read, novels_completed_c
    FROM public.reading_stats WHERE user_id = uid;
  SELECT COALESCE(longest_streak,0) INTO streak_c FROM public.reading_streaks WHERE user_id = uid;
  SELECT COALESCE(level,1) INTO level_c FROM public.user_xp WHERE user_id = uid;
  SELECT count(*)::int INTO comments_c FROM public.comments WHERE user_id = uid AND deleted_at IS NULL;
  SELECT count(*)::int INTO reviews_c FROM public.ratings WHERE user_id = uid;
  SELECT count(*)::int INTO referrals_c FROM public.referrals WHERE referrer_id = uid;
  SELECT count(*)::int INTO novels_pub_c FROM public.novels WHERE owner_id = uid AND is_published = true;
  SELECT count(*)::int INTO favorites_c FROM public.favorites WHERE user_id = uid;
  SELECT count(*)::int INTO ratings_c FROM public.ratings WHERE user_id = uid;
  SELECT COALESCE(sum(coins),0)::int INTO coins_earned_c FROM public.xp_events WHERE user_id = uid;

  FOR a IN
    SELECT ac.*, (ua.user_id IS NOT NULL) AS unlocked, ua.unlocked_at
    FROM public.achievements ac
    LEFT JOIN public.user_achievements ua
      ON ua.achievement_code = ac.code AND ua.user_id = uid
    WHERE ac.enabled = true
    ORDER BY ac.sort_order, ac.code
  LOOP
    progress := CASE a.threshold_kind
      WHEN 'chapters_read'     THEN chapters_read
      WHEN 'novels_completed'  THEN novels_completed_c
      WHEN 'comments_posted'   THEN comments_c
      WHEN 'comments'          THEN comments_c
      WHEN 'reviews_posted'    THEN reviews_c
      WHEN 'ratings'           THEN ratings_c
      WHEN 'streak_days'       THEN streak_c
      WHEN 'referrals'         THEN referrals_c
      WHEN 'level'             THEN level_c
      WHEN 'coins_earned'      THEN coins_earned_c
      WHEN 'novels_published'  THEN novels_pub_c
      WHEN 'favorites'         THEN favorites_c
      ELSE 0
    END;

    result := result || jsonb_build_object(
      'code', a.code,
      'title_ar', a.title_ar,
      'title_en', a.title_en,
      'description_ar', a.description_ar,
      'description_en', a.description_en,
      'icon', a.icon,
      'category', a.category,
      'rarity', a.rarity,
      'hidden', a.hidden,
      'xp', a.xp,
      'coins', a.coins,
      'badge_code', a.badge_code,
      'threshold_kind', a.threshold_kind,
      'threshold_value', a.threshold_value,
      'progress', LEAST(progress, a.threshold_value),
      'unlocked', a.unlocked,
      'unlocked_at', a.unlocked_at
    );
  END LOOP;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.gm_achievement_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_achievement_progress() TO authenticated;

-- 6. Admin: manually grant badge
CREATE OR REPLACE FUNCTION public.gm_admin_grant_badge(_user uuid, _code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  INSERT INTO public.user_badges(user_id, badge_code)
  VALUES (_user, _code)
  ON CONFLICT DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.gm_admin_grant_badge(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_admin_grant_badge(uuid,text) TO authenticated;

-- 7. Admin: manually grant achievement (also awards rewards + linked badge)
CREATE OR REPLACE FUNCTION public.gm_admin_grant_achievement(_user uuid, _code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  a record;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO a FROM public.achievements WHERE code = _code;
  IF NOT FOUND THEN RAISE EXCEPTION 'achievement not found'; END IF;

  INSERT INTO public.user_achievements(user_id, achievement_code)
  VALUES (_user, _code)
  ON CONFLICT DO NOTHING;

  IF a.badge_code IS NOT NULL THEN
    INSERT INTO public.user_badges(user_id, badge_code)
    VALUES (_user, a.badge_code)
    ON CONFLICT DO NOTHING;
  END IF;

  IF a.xp > 0 OR a.coins > 0 THEN
    INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key, meta)
    VALUES (_user, 'admin_grant_ach', a.xp, a.coins, _code,
            jsonb_build_object('achievement', _code, 'granted_by', auth.uid()))
    ON CONFLICT DO NOTHING;

    UPDATE public.user_xp
       SET xp = xp + a.xp,
           total_xp = total_xp + a.xp
     WHERE user_id = _user;

    IF a.coins > 0 THEN
      UPDATE public.wallets SET balance = balance + a.coins WHERE user_id = _user;
    END IF;
  END IF;

  INSERT INTO public.notifications(user_id, type, title_ar, title_en, body_ar, body_en, meta)
  VALUES (_user, 'achievement',
          'إنجاز جديد!', 'New achievement!',
          COALESCE(a.title_ar, a.code), COALESCE(a.title_en, a.title_ar, a.code),
          jsonb_build_object('achievement', _code, 'xp', a.xp, 'coins', a.coins, 'badge', a.badge_code));
END;
$$;

REVOKE ALL ON FUNCTION public.gm_admin_grant_achievement(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_admin_grant_achievement(uuid,text) TO authenticated;
