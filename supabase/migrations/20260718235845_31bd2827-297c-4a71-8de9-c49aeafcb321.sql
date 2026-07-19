
-- MISSION ENGINE — Phase 3 (retry with correct chapters column)

ALTER TABLE public.daily_missions
  ADD COLUMN IF NOT EXISTS reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'daily';

ALTER TABLE public.weekly_challenges
  ADD COLUMN IF NOT EXISTS reward jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'weekly';

ALTER TABLE public.user_daily_missions
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_weekly_challenges
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
  ADD COLUMN IF NOT EXISTS notified boolean NOT NULL DEFAULT false;

INSERT INTO public.xp_rules(code, xp, coins, daily_cap, enabled) VALUES
  ('favorite',     3, 1,  20, true),
  ('follow_author',5, 1,  10, true),
  ('like_comment', 1, 0,  30, true),
  ('complete_novel', 50, 20, 5, true)
ON CONFLICT (code) DO NOTHING;

CREATE OR REPLACE FUNCTION public._gm_track_event(_uid uuid, _code text, _ref_key text DEFAULT NULL, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _rule record; _today date := (now() AT TIME ZONE 'UTC')::date;
  _count_today int; _xp int; _coins int; _is_vip boolean; _mult numeric := 1.0;
  _new_total int; _new_level int; _old_level int; _bal int;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  SELECT * INTO _rule FROM public.xp_rules WHERE code = _code AND enabled;
  IF NOT FOUND THEN RETURN; END IF;
  IF _ref_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.xp_events WHERE user_id=_uid AND code=_code AND ref_key=_ref_key
  ) THEN RETURN; END IF;

  IF _rule.daily_cap > 0 THEN
    SELECT count(*) INTO _count_today FROM public.xp_events WHERE user_id=_uid AND code=_code AND day=_today;
    IF _count_today >= _rule.daily_cap THEN _xp := 0; _coins := 0;
    ELSE
      SELECT public.is_vip(_uid) INTO _is_vip;
      IF _is_vip THEN _mult := 2.0; END IF;
      _xp := floor(_rule.xp * _mult); _coins := floor(_rule.coins * _mult);
    END IF;
  ELSE
    SELECT public.is_vip(_uid) INTO _is_vip;
    IF _is_vip THEN _mult := 2.0; END IF;
    _xp := floor(_rule.xp * _mult); _coins := floor(_rule.coins * _mult);
  END IF;

  IF _xp > 0 OR _coins > 0 THEN
    INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key, day, meta)
      VALUES (_uid, _code, _xp, _coins, _ref_key, _today, COALESCE(_meta,'{}'::jsonb));
    INSERT INTO public.user_xp(user_id, xp, total_xp, level, updated_at)
      VALUES (_uid, _xp, _xp, public.gm_level_from_xp(_xp), now())
    ON CONFLICT (user_id) DO UPDATE SET
      xp = user_xp.xp + EXCLUDED.xp,
      total_xp = user_xp.total_xp + EXCLUDED.xp,
      level = public.gm_level_from_xp(user_xp.total_xp + EXCLUDED.xp),
      updated_at = now()
    RETURNING level, total_xp INTO _new_level, _new_total;

    IF _coins > 0 THEN
      INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
      UPDATE public.wallets SET coins = coins + _coins, updated_at = now()
        WHERE user_id=_uid RETURNING coins INTO _bal;
      INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
        VALUES (_uid, 'gamification', _coins, _bal, 'gm:'||_code);
    END IF;

    SELECT COALESCE(public.gm_level_from_xp(GREATEST(_new_total - _xp, 0)), 0) INTO _old_level;
    IF _new_level > _old_level THEN
      INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (_uid, 'level_up', 'ترقّيت للمستوى '||_new_level::text, 'استمر في القراءة لكسب المزيد', '/profile');
    END IF;
  END IF;

  INSERT INTO public.user_daily_missions(user_id, mission_code, day, progress, completed)
    SELECT _uid, m.code, _today, 1, (1 >= m.target_value)
      FROM public.daily_missions m
      WHERE m.enabled AND m.target_kind = _code
  ON CONFLICT (user_id, mission_code, day) DO UPDATE SET
    progress = user_daily_missions.progress + 1,
    completed = (user_daily_missions.progress + 1) >= (
      SELECT target_value FROM public.daily_missions WHERE code = user_daily_missions.mission_code),
    completed_at = CASE
      WHEN user_daily_missions.completed_at IS NULL
        AND (user_daily_missions.progress + 1) >= (SELECT target_value FROM public.daily_missions WHERE code = user_daily_missions.mission_code)
      THEN now() ELSE user_daily_missions.completed_at END,
    updated_at = now();

  INSERT INTO public.user_weekly_challenges(user_id, challenge_id, progress, completed)
    SELECT _uid, wc.id, 1, (1 >= wc.target_value)
      FROM public.weekly_challenges wc
      WHERE wc.enabled AND wc.target_kind = _code AND wc.starts_at <= now() AND wc.ends_at > now()
  ON CONFLICT (user_id, challenge_id) DO UPDATE SET
    progress = user_weekly_challenges.progress + 1,
    completed = (user_weekly_challenges.progress + 1) >= (
      SELECT target_value FROM public.weekly_challenges WHERE id = user_weekly_challenges.challenge_id),
    completed_at = CASE
      WHEN user_weekly_challenges.completed_at IS NULL
        AND (user_weekly_challenges.progress + 1) >= (SELECT target_value FROM public.weekly_challenges WHERE id = user_weekly_challenges.challenge_id)
      THEN now() ELSE user_weekly_challenges.completed_at END,
    updated_at = now();

  PERFORM public.gm_check_achievements(_uid);
END; $$;

REVOKE ALL ON FUNCTION public._gm_track_event(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public._gm_notify_mission_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _title text; BEGIN
  IF NEW.completed AND NOT COALESCE(OLD.completed,false) AND NOT NEW.notified THEN
    SELECT title_ar INTO _title FROM public.daily_missions WHERE code = NEW.mission_code;
    INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.user_id, 'mission_completed', 'أكملت مهمة: '||COALESCE(_title,NEW.mission_code), 'اذهب لاستلام المكافأة', '/missions');
    NEW.notified := true;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gm_notify_mission ON public.user_daily_missions;
CREATE TRIGGER trg_gm_notify_mission BEFORE UPDATE ON public.user_daily_missions
  FOR EACH ROW EXECUTE FUNCTION public._gm_notify_mission_completed();

CREATE OR REPLACE FUNCTION public._gm_notify_challenge_completed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _title text; BEGIN
  IF NEW.completed AND NOT COALESCE(OLD.completed,false) AND NOT NEW.notified THEN
    SELECT title_ar INTO _title FROM public.weekly_challenges WHERE id = NEW.challenge_id;
    INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (NEW.user_id, 'challenge_completed', 'أكملت تحدي: '||COALESCE(_title,'أسبوعي'), 'اذهب لاستلام المكافأة', '/missions');
    NEW.notified := true;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gm_notify_challenge ON public.user_weekly_challenges;
CREATE TRIGGER trg_gm_notify_challenge BEFORE UPDATE ON public.user_weekly_challenges
  FOR EACH ROW EXECUTE FUNCTION public._gm_notify_challenge_completed();

-- Auto-track triggers
CREATE OR REPLACE FUNCTION public._gm_on_favorite() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._gm_track_event(NEW.user_id, 'favorite', NEW.novel_id::text); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_gm_favorite ON public.favorites;
CREATE TRIGGER trg_gm_favorite AFTER INSERT ON public.favorites
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_favorite();

CREATE OR REPLACE FUNCTION public._gm_on_bookmark() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._gm_track_event(NEW.user_id, 'bookmark', NEW.id::text); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_gm_bookmark ON public.bookmarks;
CREATE TRIGGER trg_gm_bookmark AFTER INSERT ON public.bookmarks
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_bookmark();

CREATE OR REPLACE FUNCTION public._gm_on_follow() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._gm_track_event(NEW.follower_id, 'follow_author', NEW.author_id::text); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_gm_follow ON public.author_follows;
CREATE TRIGGER trg_gm_follow AFTER INSERT ON public.author_follows
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_follow();

CREATE OR REPLACE FUNCTION public._gm_on_comment_like() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._gm_track_event(NEW.user_id, 'like_comment', NEW.comment_id::text); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_gm_comment_like ON public.comment_likes;
CREATE TRIGGER trg_gm_comment_like AFTER INSERT ON public.comment_likes
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_comment_like();

CREATE OR REPLACE FUNCTION public._gm_on_rating() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._gm_track_event(NEW.user_id, 'rate_novel', NEW.novel_id::text); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_gm_rating ON public.ratings;
CREATE TRIGGER trg_gm_rating AFTER INSERT ON public.ratings
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_rating();

CREATE OR REPLACE FUNCTION public._gm_on_comment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN PERFORM public._gm_track_event(NEW.author_id, 'comment', NEW.id::text); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS trg_gm_comment ON public.comments;
CREATE TRIGGER trg_gm_comment AFTER INSERT ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_comment();

CREATE OR REPLACE FUNCTION public._gm_on_chapter_published() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _author uuid; BEGIN
  IF NEW.status = 'published' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    SELECT owner_id INTO _author FROM public.novels WHERE id = NEW.novel_id;
    PERFORM public._gm_track_event(_author, 'publish_chapter', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gm_chapter_published ON public.chapters;
CREATE TRIGGER trg_gm_chapter_published AFTER INSERT OR UPDATE OF status ON public.chapters
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_chapter_published();

CREATE OR REPLACE FUNCTION public._gm_on_novel_published() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.is_published AND (TG_OP='INSERT' OR NOT COALESCE(OLD.is_published,false)) THEN
    PERFORM public._gm_track_event(NEW.owner_id, 'publish_novel', NEW.id::text);
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS trg_gm_novel_published ON public.novels;
CREATE TRIGGER trg_gm_novel_published AFTER INSERT OR UPDATE OF is_published ON public.novels
  FOR EACH ROW EXECUTE FUNCTION public._gm_on_novel_published();

-- Reward payload applicator
CREATE OR REPLACE FUNCTION public._gm_apply_reward(_uid uuid, _reward jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _badge text; _title text; _frame text; _vip_days int; _boxes int; _i int;
BEGIN
  IF _uid IS NULL OR _reward IS NULL OR _reward = '{}'::jsonb THEN RETURN; END IF;
  _badge := _reward->>'badge';
  IF _badge IS NOT NULL THEN
    INSERT INTO public.user_badges(user_id, badge_code) VALUES (_uid, _badge) ON CONFLICT DO NOTHING;
  END IF;
  _title := _reward->>'title';
  IF _title IS NOT NULL THEN
    INSERT INTO public.user_badges(user_id, badge_code) VALUES (_uid, 'title:'||_title) ON CONFLICT DO NOTHING;
  END IF;
  _frame := _reward->>'frame';
  IF _frame IS NOT NULL THEN
    INSERT INTO public.user_badges(user_id, badge_code) VALUES (_uid, 'frame:'||_frame) ON CONFLICT DO NOTHING;
  END IF;
  _boxes := COALESCE((_reward->>'boxes')::int, 0);
  IF _boxes > 0 THEN
    FOR _i IN 1.._boxes LOOP
      INSERT INTO public.reward_boxes(user_id, source) VALUES (_uid, 'mission');
    END LOOP;
  END IF;
  _vip_days := COALESCE((_reward->>'vip_days')::int, 0);
  IF _vip_days > 0 THEN
    INSERT INTO public.vip_subscriptions(user_id, plan_code, status, starts_at, ends_at)
    VALUES (_uid, 'mission_reward', 'active', now(), now() + (_vip_days || ' days')::interval)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public._gm_apply_reward(uuid, jsonb) FROM PUBLIC, anon, authenticated;

-- Extend claim RPCs
CREATE OR REPLACE FUNCTION public.gm_claim_mission(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _m record; _u record; _bal int; _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _m FROM public.daily_missions WHERE code=_code AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_mission'; END IF;
  SELECT * INTO _u FROM public.user_daily_missions WHERE user_id=_uid AND mission_code=_code AND day=_today FOR UPDATE;
  IF NOT FOUND OR NOT _u.completed OR _u.claimed THEN RAISE EXCEPTION 'not_claimable'; END IF;
  UPDATE public.user_daily_missions SET claimed=true, claimed_at=now(), updated_at=now()
    WHERE user_id=_uid AND mission_code=_code AND day=_today;
  IF _m.xp > 0 THEN
    INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key)
      VALUES (_uid, 'mission_claim', _m.xp, _m.coins, _code||':'||_today::text);
    INSERT INTO public.user_xp(user_id, xp, total_xp, level)
      VALUES (_uid, _m.xp, _m.xp, public.gm_level_from_xp(_m.xp))
    ON CONFLICT (user_id) DO UPDATE SET
      xp = user_xp.xp + _m.xp, total_xp = user_xp.total_xp + _m.xp,
      level = public.gm_level_from_xp(user_xp.total_xp + _m.xp), updated_at = now();
  END IF;
  IF _m.coins > 0 THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
    UPDATE public.wallets SET coins = coins + _m.coins WHERE user_id=_uid RETURNING coins INTO _bal;
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
      VALUES (_uid, 'gamification', _m.coins, _bal, 'mission:'||_code);
  END IF;
  PERFORM public._gm_apply_reward(_uid, _m.reward);
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_uid, 'reward_claimed', 'تم استلام مكافأة المهمة', _m.title_ar, '/missions');
  RETURN jsonb_build_object('ok', true, 'xp', _m.xp, 'coins', _m.coins, 'reward', _m.reward);
END $$;

CREATE OR REPLACE FUNCTION public.gm_claim_challenge(_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid := auth.uid(); _c record; _u record; _bal int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _c FROM public.weekly_challenges WHERE id=_id AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_challenge'; END IF;
  SELECT * INTO _u FROM public.user_weekly_challenges WHERE user_id=_uid AND challenge_id=_id FOR UPDATE;
  IF NOT FOUND OR NOT _u.completed OR _u.claimed THEN RAISE EXCEPTION 'not_claimable'; END IF;
  UPDATE public.user_weekly_challenges SET claimed=true, claimed_at=now(), updated_at=now()
    WHERE user_id=_uid AND challenge_id=_id;
  IF _c.xp > 0 THEN
    INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key)
      VALUES (_uid, 'challenge_claim', _c.xp, _c.coins, _id::text);
    INSERT INTO public.user_xp(user_id, xp, total_xp, level)
      VALUES (_uid, _c.xp, _c.xp, public.gm_level_from_xp(_c.xp))
    ON CONFLICT (user_id) DO UPDATE SET
      xp = user_xp.xp + _c.xp, total_xp = user_xp.total_xp + _c.xp,
      level = public.gm_level_from_xp(user_xp.total_xp + _c.xp), updated_at = now();
  END IF;
  IF _c.coins > 0 THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
    UPDATE public.wallets SET coins = coins + _c.coins WHERE user_id=_uid RETURNING coins INTO _bal;
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
      VALUES (_uid, 'gamification', _c.coins, _bal, 'challenge:'||_id::text);
  END IF;
  PERFORM public._gm_apply_reward(_uid, _c.reward);
  INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_uid, 'reward_claimed', 'تم استلام مكافأة التحدي', _c.title_ar, '/missions');
  RETURN jsonb_build_object('ok', true, 'xp', _c.xp, 'coins', _c.coins, 'reward', _c.reward);
END $$;

-- Admin analytics
CREATE OR REPLACE FUNCTION public.gm_mission_analytics(_days int DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _result jsonb;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'daily_active', (SELECT count(DISTINCT user_id) FROM public.user_daily_missions
       WHERE day = (now() AT TIME ZONE 'UTC')::date),
    'weekly_active', (SELECT count(DISTINCT user_id) FROM public.user_daily_missions
       WHERE day >= (now() AT TIME ZONE 'UTC')::date - 7),
    'completion_rate', (SELECT ROUND(100.0 * count(*) FILTER (WHERE completed) / GREATEST(count(*),1), 2)
        FROM public.user_daily_missions WHERE day >= (now() AT TIME ZONE 'UTC')::date - _days),
    'avg_completion_minutes', (SELECT ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - (day::timestamptz)))/60)::numeric, 2)
        FROM public.user_daily_missions WHERE completed AND completed_at IS NOT NULL
          AND day >= (now() AT TIME ZONE 'UTC')::date - _days),
    'per_mission', (SELECT jsonb_agg(row_to_json(x)) FROM (
        SELECT m.code, m.title_ar, m.difficulty, m.category,
          count(u.*) AS started,
          count(u.*) FILTER (WHERE u.completed) AS completed,
          count(u.*) FILTER (WHERE u.claimed) AS claimed,
          ROUND(100.0 * count(u.*) FILTER (WHERE u.completed) / GREATEST(count(u.*),1), 2) AS completion_rate
        FROM public.daily_missions m
        LEFT JOIN public.user_daily_missions u ON u.mission_code = m.code AND u.day >= (now() AT TIME ZONE 'UTC')::date - _days
        WHERE m.enabled GROUP BY m.code, m.title_ar, m.difficulty, m.category
        ORDER BY completed DESC) x),
    'timeseries', (SELECT jsonb_agg(row_to_json(t) ORDER BY t.day) FROM (
        SELECT day::text, count(*) FILTER (WHERE completed) AS completed, count(*) AS started
        FROM public.user_daily_missions
        WHERE day >= (now() AT TIME ZONE 'UTC')::date - _days
        GROUP BY day) t)
  ) INTO _result;
  RETURN COALESCE(_result, '{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.gm_mission_analytics(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_mission_analytics(int) TO authenticated;

-- Smart generator
CREATE OR REPLACE FUNCTION public.gm_generate_missions(_difficulty text DEFAULT 'medium', _count int DEFAULT 3)
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  _pool jsonb := '[
    {"kind":"read_chapter","label":"اقرأ %s فصول","targets":{"easy":3,"medium":5,"hard":10,"legendary":25},"xp":{"easy":30,"medium":60,"hard":150,"legendary":400}},
    {"kind":"comment","label":"اكتب %s تعليقات","targets":{"easy":1,"medium":3,"hard":5,"legendary":10},"xp":{"easy":15,"medium":40,"hard":80,"legendary":200}},
    {"kind":"favorite","label":"أضف %s روايات للمفضلة","targets":{"easy":1,"medium":2,"hard":5,"legendary":10},"xp":{"easy":10,"medium":25,"hard":60,"legendary":150}},
    {"kind":"bookmark","label":"احفظ %s فصول","targets":{"easy":1,"medium":3,"hard":5,"legendary":10},"xp":{"easy":10,"medium":25,"hard":60,"legendary":150}},
    {"kind":"rate_novel","label":"قيّم %s روايات","targets":{"easy":1,"medium":2,"hard":5,"legendary":10},"xp":{"easy":10,"medium":30,"hard":80,"legendary":180}},
    {"kind":"follow_author","label":"تابع %s كتّاب","targets":{"easy":1,"medium":2,"hard":3,"legendary":5},"xp":{"easy":10,"medium":25,"hard":60,"legendary":120}},
    {"kind":"like_comment","label":"أعجب بـ %s تعليقات","targets":{"easy":2,"medium":5,"hard":10,"legendary":25},"xp":{"easy":10,"medium":25,"hard":50,"legendary":120}},
    {"kind":"share_novel","label":"شارك %s روايات","targets":{"easy":1,"medium":2,"hard":3,"legendary":5},"xp":{"easy":10,"medium":25,"hard":50,"legendary":100}}
  ]'::jsonb;
  _r jsonb; _target int; _xp int; _code text; _created int := 0;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _difficulty NOT IN ('easy','medium','hard','legendary') THEN _difficulty := 'medium'; END IF;
  FOR _r IN SELECT value FROM jsonb_array_elements(_pool) WITH ORDINALITY t(value, ord) ORDER BY random() LIMIT _count LOOP
    _target := (_r->'targets'->>_difficulty)::int;
    _xp := (_r->'xp'->>_difficulty)::int;
    _code := substring('gen_' || (_r->>'kind') || '_' || replace(gen_random_uuid()::text,'-',''), 1, 40);
    INSERT INTO public.daily_missions(code, title_ar, target_kind, target_value, xp, coins, enabled, difficulty, category, event_type)
    VALUES (_code, format(_r->>'label', _target::text), _r->>'kind', _target, _xp,
            GREATEST(_xp/5, 1), true, _difficulty, 'generated', 'daily')
    ON CONFLICT (code) DO NOTHING;
    _created := _created + 1;
  END LOOP;
  RETURN _created;
END $$;
REVOKE ALL ON FUNCTION public.gm_generate_missions(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_generate_missions(text, int) TO authenticated;

-- Realtime
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_daily_missions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_weekly_challenges; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
