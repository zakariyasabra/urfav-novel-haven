
-- ========== FAVNOL GAMIFICATION — PHASE B: RPCs ==========

-- Level formula helper
CREATE OR REPLACE FUNCTION public.gm_level_from_xp(_total_xp integer)
RETURNS integer LANGUAGE sql IMMUTABLE AS $$
  SELECT GREATEST(0, floor(sqrt(GREATEST(_total_xp,0)::numeric / 50)))::int
$$;

-- ---------- gm_award ----------
CREATE OR REPLACE FUNCTION public.gm_award(_code text, _ref_key text DEFAULT NULL, _meta jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rule record;
  _xp int := 0;
  _coins int := 0;
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _count_today int;
  _new_total int;
  _new_level int;
  _old_level int;
  _bal int;
  _is_vip boolean;
  _multiplier numeric := 1.0;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated'); END IF;
  SELECT * INTO _rule FROM public.xp_rules WHERE code = _code AND enabled;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'unknown_code'); END IF;

  -- Idempotency: if ref_key provided, unique constraint blocks duplicates
  IF _ref_key IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.xp_events WHERE user_id = _uid AND code = _code AND ref_key = _ref_key
  ) THEN
    RETURN jsonb_build_object('ok', true, 'skipped', 'duplicate');
  END IF;

  -- Daily cap
  IF _rule.daily_cap > 0 THEN
    SELECT count(*) INTO _count_today FROM public.xp_events
      WHERE user_id = _uid AND code = _code AND day = _today;
    IF _count_today >= _rule.daily_cap THEN
      RETURN jsonb_build_object('ok', true, 'skipped', 'daily_cap');
    END IF;
  END IF;

  -- VIP multiplier (2x XP + coins)
  SELECT public.is_vip(_uid) INTO _is_vip;
  IF _is_vip THEN _multiplier := 2.0; END IF;

  _xp := floor(_rule.xp * _multiplier);
  _coins := floor(_rule.coins * _multiplier);

  -- Insert ledger row
  INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key, day, meta)
    VALUES (_uid, _code, _xp, _coins, _ref_key, _today, COALESCE(_meta,'{}'::jsonb))
  RETURNING id INTO _new_id;

  -- Update user_xp
  INSERT INTO public.user_xp(user_id, xp, total_xp, level, updated_at)
    VALUES (_uid, _xp, _xp, public.gm_level_from_xp(_xp), now())
  ON CONFLICT (user_id) DO UPDATE SET
    xp = user_xp.xp + EXCLUDED.xp,
    total_xp = user_xp.total_xp + EXCLUDED.xp,
    level = public.gm_level_from_xp(user_xp.total_xp + EXCLUDED.xp),
    updated_at = now()
  RETURNING level, total_xp INTO _new_level, _new_total;

  -- Credit coins into existing wallets
  IF _coins > 0 THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0)
      ON CONFLICT (user_id) DO NOTHING;
    UPDATE public.wallets SET coins = coins + _coins, updated_at = now()
      WHERE user_id = _uid RETURNING coins INTO _bal;
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
      VALUES (_uid, 'gamification', _coins, _bal, 'gm:'||_code);
  END IF;

  -- Detect level up
  SELECT COALESCE(public.gm_level_from_xp(_new_total - _xp), 0) INTO _old_level;
  IF _new_level > _old_level THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
      VALUES (_uid, 'level_up', 'ترقّيت للمستوى ' || _new_level::text, 'استمر في القراءة لكسب المزيد', '/profile');
  END IF;

  -- Update daily missions progress (best-effort)
  INSERT INTO public.user_daily_missions(user_id, mission_code, day, progress, completed)
    SELECT _uid, m.code, _today, 1, (1 >= m.target_value)
      FROM public.daily_missions m
      WHERE m.enabled AND m.target_kind = _code
  ON CONFLICT (user_id, mission_code, day) DO UPDATE SET
    progress = user_daily_missions.progress + 1,
    completed = (user_daily_missions.progress + 1) >= (
      SELECT target_value FROM public.daily_missions WHERE code = user_daily_missions.mission_code
    ),
    updated_at = now();

  -- Weekly challenges progress
  UPDATE public.user_weekly_challenges uwc
    SET progress = uwc.progress + 1,
        completed = (uwc.progress + 1) >= wc.target_value,
        updated_at = now()
    FROM public.weekly_challenges wc
    WHERE uwc.challenge_id = wc.id AND uwc.user_id = _uid
      AND wc.enabled AND wc.target_kind = _code
      AND wc.starts_at <= now() AND wc.ends_at > now();

  -- Auto-check simple achievements (chapters_read, comments)
  PERFORM public.gm_check_achievements(_uid);

  RETURN jsonb_build_object(
    'ok', true, 'xp', _xp, 'coins', _coins,
    'total_xp', _new_total, 'level', _new_level,
    'leveled_up', _new_level > _old_level,
    'event_id', _new_id
  );
END $$;

REVOKE ALL ON FUNCTION public.gm_award(text, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_award(text, text, jsonb) TO authenticated;

-- ---------- gm_check_achievements ----------
CREATE OR REPLACE FUNCTION public.gm_check_achievements(_user uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _a record;
  _val int;
  _awarded int := 0;
BEGIN
  IF _user IS NULL THEN RETURN 0; END IF;
  FOR _a IN SELECT * FROM public.achievements WHERE enabled LOOP
    IF EXISTS (SELECT 1 FROM public.user_achievements WHERE user_id=_user AND achievement_code=_a.code) THEN
      CONTINUE;
    END IF;
    _val := CASE _a.threshold_kind
      WHEN 'chapters_read' THEN (SELECT count(*)::int FROM public.xp_events WHERE user_id=_user AND code='read_chapter')
      WHEN 'comments' THEN (SELECT count(*)::int FROM public.comments WHERE author_id=_user)
      WHEN 'novels_published' THEN (SELECT count(*)::int FROM public.novels WHERE owner_id=_user AND is_published=true)
      WHEN 'streak_days' THEN COALESCE((SELECT longest_streak FROM public.reading_streaks WHERE user_id=_user),0)
      WHEN 'level' THEN COALESCE((SELECT level FROM public.user_xp WHERE user_id=_user),0)
      ELSE 0
    END;
    IF _val >= _a.threshold_value THEN
      INSERT INTO public.user_achievements(user_id, achievement_code) VALUES (_user, _a.code)
        ON CONFLICT DO NOTHING;
      -- Award badge
      IF _a.badge_code IS NOT NULL THEN
        INSERT INTO public.user_badges(user_id, badge_code) VALUES (_user, _a.badge_code)
          ON CONFLICT DO NOTHING;
      END IF;
      -- Award XP/coins bonus (bypasses caps, direct ledger)
      IF _a.xp > 0 OR _a.coins > 0 THEN
        INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key, meta)
          VALUES (_user, 'achievement', _a.xp, _a.coins, _a.code, jsonb_build_object('achievement',_a.code))
        ON CONFLICT DO NOTHING;
        INSERT INTO public.user_xp(user_id, xp, total_xp, level)
          VALUES (_user, _a.xp, _a.xp, public.gm_level_from_xp(_a.xp))
        ON CONFLICT (user_id) DO UPDATE SET
          xp = user_xp.xp + _a.xp,
          total_xp = user_xp.total_xp + _a.xp,
          level = public.gm_level_from_xp(user_xp.total_xp + _a.xp),
          updated_at = now();
        IF _a.coins > 0 THEN
          INSERT INTO public.wallets(user_id, coins) VALUES (_user, 0) ON CONFLICT DO NOTHING;
          UPDATE public.wallets SET coins = coins + _a.coins WHERE user_id = _user;
        END IF;
      END IF;
      INSERT INTO public.notifications(user_id, type, title, body, link)
        VALUES (_user, 'achievement', 'إنجاز جديد: '||_a.title_ar, COALESCE(_a.description_ar,''), '/achievements');
      _awarded := _awarded + 1;
    END IF;
  END LOOP;
  RETURN _awarded;
END $$;

REVOKE ALL ON FUNCTION public.gm_check_achievements(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_check_achievements(uuid) TO authenticated;

-- ---------- gm_claim_mission ----------
CREATE OR REPLACE FUNCTION public.gm_claim_mission(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'UTC')::date;
  _m record;
  _u record;
  _bal int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _m FROM public.daily_missions WHERE code = _code AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_mission'; END IF;
  SELECT * INTO _u FROM public.user_daily_missions
    WHERE user_id = _uid AND mission_code = _code AND day = _today FOR UPDATE;
  IF NOT FOUND OR NOT _u.completed THEN RAISE EXCEPTION 'not_completed'; END IF;
  IF _u.claimed THEN RAISE EXCEPTION 'already_claimed'; END IF;
  UPDATE public.user_daily_missions SET claimed = true, updated_at = now()
    WHERE user_id = _uid AND mission_code = _code AND day = _today;
  INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key)
    VALUES (_uid, 'mission_claim', _m.xp, _m.coins, _code||':'||_today::text);
  INSERT INTO public.user_xp(user_id, xp, total_xp, level)
    VALUES (_uid, _m.xp, _m.xp, public.gm_level_from_xp(_m.xp))
  ON CONFLICT (user_id) DO UPDATE SET
    xp = user_xp.xp + _m.xp,
    total_xp = user_xp.total_xp + _m.xp,
    level = public.gm_level_from_xp(user_xp.total_xp + _m.xp),
    updated_at = now();
  IF _m.coins > 0 THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
    UPDATE public.wallets SET coins = coins + _m.coins WHERE user_id = _uid RETURNING coins INTO _bal;
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
      VALUES (_uid, 'gamification', _m.coins, _bal, 'mission:'||_code);
  END IF;
  RETURN jsonb_build_object('ok', true, 'xp', _m.xp, 'coins', _m.coins);
END $$;

REVOKE ALL ON FUNCTION public.gm_claim_mission(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_claim_mission(text) TO authenticated;

-- ---------- gm_claim_challenge ----------
CREATE OR REPLACE FUNCTION public.gm_claim_challenge(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _c record;
  _u record;
  _bal int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _c FROM public.weekly_challenges WHERE id=_id AND enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'unknown_challenge'; END IF;
  SELECT * INTO _u FROM public.user_weekly_challenges WHERE user_id=_uid AND challenge_id=_id FOR UPDATE;
  IF NOT FOUND OR NOT _u.completed OR _u.claimed THEN RAISE EXCEPTION 'not_claimable'; END IF;
  UPDATE public.user_weekly_challenges SET claimed=true, updated_at=now() WHERE user_id=_uid AND challenge_id=_id;
  INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key)
    VALUES (_uid, 'challenge_claim', _c.xp, _c.coins, _id::text);
  INSERT INTO public.user_xp(user_id, xp, total_xp, level)
    VALUES (_uid, _c.xp, _c.xp, public.gm_level_from_xp(_c.xp))
  ON CONFLICT (user_id) DO UPDATE SET
    xp = user_xp.xp + _c.xp,
    total_xp = user_xp.total_xp + _c.xp,
    level = public.gm_level_from_xp(user_xp.total_xp + _c.xp),
    updated_at = now();
  IF _c.coins > 0 THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
    UPDATE public.wallets SET coins = coins + _c.coins WHERE user_id=_uid RETURNING coins INTO _bal;
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
      VALUES (_uid, 'gamification', _c.coins, _bal, 'challenge:'||_id::text);
  END IF;
  RETURN jsonb_build_object('ok', true, 'xp', _c.xp, 'coins', _c.coins);
END $$;
REVOKE ALL ON FUNCTION public.gm_claim_challenge(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_claim_challenge(uuid) TO authenticated;

-- ---------- gm_open_box ----------
CREATE OR REPLACE FUNCTION public.gm_open_box(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _box record;
  _pool record;
  _total_w int;
  _r int;
  _acc int := 0;
  _picked jsonb;
  _bal int;
  _vip_days int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT * INTO _box FROM public.reward_boxes WHERE id=_id AND user_id=_uid FOR UPDATE;
  IF NOT FOUND OR _box.opened THEN RAISE EXCEPTION 'not_openable'; END IF;
  SELECT COALESCE(sum(weight),0) INTO _total_w FROM public.reward_box_pool WHERE enabled;
  IF _total_w <= 0 THEN RAISE EXCEPTION 'empty_pool'; END IF;
  _r := floor(random() * _total_w)::int;
  FOR _pool IN SELECT * FROM public.reward_box_pool WHERE enabled ORDER BY id LOOP
    _acc := _acc + _pool.weight;
    IF _r < _acc THEN _picked := _pool.reward; EXIT; END IF;
  END LOOP;

  -- Apply reward
  IF (_picked->>'coins')::int IS NOT NULL AND (_picked->>'coins')::int > 0 THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_uid, 0) ON CONFLICT DO NOTHING;
    UPDATE public.wallets SET coins = coins + (_picked->>'coins')::int WHERE user_id=_uid RETURNING coins INTO _bal;
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
      VALUES (_uid, 'gamification', (_picked->>'coins')::int, _bal, 'reward_box');
  END IF;
  IF (_picked->>'xp')::int IS NOT NULL AND (_picked->>'xp')::int > 0 THEN
    INSERT INTO public.user_xp(user_id, xp, total_xp, level)
      VALUES (_uid, (_picked->>'xp')::int, (_picked->>'xp')::int, public.gm_level_from_xp((_picked->>'xp')::int))
    ON CONFLICT (user_id) DO UPDATE SET
      xp = user_xp.xp + (_picked->>'xp')::int,
      total_xp = user_xp.total_xp + (_picked->>'xp')::int,
      level = public.gm_level_from_xp(user_xp.total_xp + (_picked->>'xp')::int),
      updated_at = now();
  END IF;
  IF _picked ? 'badge' THEN
    INSERT INTO public.user_badges(user_id, badge_code) VALUES (_uid, _picked->>'badge')
      ON CONFLICT DO NOTHING;
  END IF;
  IF (_picked->>'vip_days')::int IS NOT NULL AND (_picked->>'vip_days')::int > 0 THEN
    _vip_days := (_picked->>'vip_days')::int;
    INSERT INTO public.vip_subscriptions(user_id, plan_id, status, started_at, expires_at, provider)
      VALUES (_uid, NULL, 'active', now(), now() + make_interval(days => _vip_days), 'reward_box');
    UPDATE public.profiles SET is_vip=true,
      vip_expires_at = GREATEST(COALESCE(vip_expires_at, now()), now() + make_interval(days => _vip_days))
      WHERE id=_uid;
  END IF;

  UPDATE public.reward_boxes SET opened=true, reward=_picked, opened_at=now() WHERE id=_id;
  RETURN jsonb_build_object('ok', true, 'reward', _picked);
END $$;
REVOKE ALL ON FUNCTION public.gm_open_box(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_open_box(uuid) TO authenticated;

-- ---------- referral ----------
CREATE OR REPLACE FUNCTION public.gm_get_or_create_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
  _uname text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT code INTO _code FROM public.referral_codes WHERE user_id=_uid;
  IF _code IS NOT NULL THEN RETURN _code; END IF;
  SELECT username INTO _uname FROM public.profiles WHERE id=_uid;
  _code := COALESCE(_uname, substr(replace(_uid::text,'-',''),1,10));
  BEGIN
    INSERT INTO public.referral_codes(user_id, code) VALUES (_uid, _code);
  EXCEPTION WHEN unique_violation THEN
    _code := _code || substr(replace(_uid::text,'-',''),1,4);
    INSERT INTO public.referral_codes(user_id, code) VALUES (_uid, _code)
      ON CONFLICT (user_id) DO UPDATE SET code=EXCLUDED.code;
  END;
  RETURN _code;
END $$;
REVOKE ALL ON FUNCTION public.gm_get_or_create_referral_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_get_or_create_referral_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.gm_use_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inviter uuid;
  _profile_created timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT user_id INTO _inviter FROM public.referral_codes WHERE code=_code;
  IF _inviter IS NULL THEN RAISE EXCEPTION 'invalid_code'; END IF;
  IF _inviter = _uid THEN RAISE EXCEPTION 'self_referral'; END IF;
  IF EXISTS (SELECT 1 FROM public.referrals WHERE invitee_id=_uid) THEN RAISE EXCEPTION 'already_referred'; END IF;
  -- Only within 7 days of signup
  SELECT created_at INTO _profile_created FROM public.profiles WHERE id=_uid;
  IF _profile_created IS NOT NULL AND _profile_created < now() - interval '7 days' THEN
    RAISE EXCEPTION 'window_expired';
  END IF;
  INSERT INTO public.referrals(invitee_id, inviter_id, code, rewarded) VALUES (_uid, _inviter, _code, true);
  -- Award via ledger (bypasses caps for one-shot)
  PERFORM public.gm_admin_grant(_inviter, 'invite', _code);
  PERFORM public.gm_admin_grant(_uid, 'invited', _code);
  RETURN jsonb_build_object('ok', true, 'inviter', _inviter);
END $$;
REVOKE ALL ON FUNCTION public.gm_use_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_use_referral(text) TO authenticated;

-- ---------- gm_admin_grant (bypass caps, used internally + by admin) ----------
CREATE OR REPLACE FUNCTION public.gm_admin_grant(_user uuid, _code text, _ref text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _rule record; _bal int;
BEGIN
  -- Called internally (by other SECURITY DEFINER fns) or by admin
  IF NOT (public.has_any_admin_role(auth.uid()) OR current_user = 'postgres' OR auth.uid() IS NULL) THEN
    -- Allow if the CALLER is another security definer function (auth.uid() same as target for gm_use_referral)
    IF auth.uid() <> _user AND NOT public.has_any_admin_role(auth.uid()) THEN
      RAISE EXCEPTION 'forbidden';
    END IF;
  END IF;
  SELECT * INTO _rule FROM public.xp_rules WHERE code=_code;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','unknown_code'); END IF;
  INSERT INTO public.xp_events(user_id, code, xp, coins, ref_key, meta)
    VALUES (_user, _code, _rule.xp, _rule.coins, _ref, jsonb_build_object('admin_grant',true))
  ON CONFLICT DO NOTHING;
  INSERT INTO public.user_xp(user_id, xp, total_xp, level)
    VALUES (_user, _rule.xp, _rule.xp, public.gm_level_from_xp(_rule.xp))
  ON CONFLICT (user_id) DO UPDATE SET
    xp = user_xp.xp + _rule.xp,
    total_xp = user_xp.total_xp + _rule.xp,
    level = public.gm_level_from_xp(user_xp.total_xp + _rule.xp),
    updated_at = now();
  IF _rule.coins > 0 THEN
    INSERT INTO public.wallets(user_id, coins) VALUES (_user, 0) ON CONFLICT DO NOTHING;
    UPDATE public.wallets SET coins = coins + _rule.coins WHERE user_id=_user RETURNING coins INTO _bal;
    INSERT INTO public.coin_transactions(user_id, kind, amount, balance_after, note)
      VALUES (_user, 'gamification', _rule.coins, _bal, 'grant:'||_code);
  END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.gm_admin_grant(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_admin_grant(uuid, text, text) TO authenticated;

-- ---------- leaderboard reader ----------
CREATE OR REPLACE FUNCTION public.gm_leaderboard(_metric text DEFAULT 'xp', _period text DEFAULT 'all_time', _limit int DEFAULT 50)
RETURNS TABLE(user_id uuid, username text, display_name text, avatar_url text, score bigint, rank int)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _limit IS NULL OR _limit < 1 OR _limit > 200 THEN _limit := 50; END IF;

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
      AND e.created_at >= (CASE WHEN _period='weekly' THEN now() - interval '7 days' ELSE now() - interval '30 days' END)
    GROUP BY p.id
    HAVING COALESCE(sum(e.xp),0) > 0
    ORDER BY 5 DESC LIMIT _limit;
  ELSE
    RETURN;
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.gm_leaderboard(text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gm_leaderboard(text, text, int) TO authenticated, anon;

-- ---------- gm_my_profile (summary) ----------
CREATE OR REPLACE FUNCTION public.gm_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _r jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT jsonb_build_object(
    'xp', COALESCE((SELECT xp FROM public.user_xp WHERE user_id=_uid),0),
    'total_xp', COALESCE((SELECT total_xp FROM public.user_xp WHERE user_id=_uid),0),
    'level', COALESCE((SELECT level FROM public.user_xp WHERE user_id=_uid),0),
    'coins', COALESCE((SELECT coins FROM public.wallets WHERE user_id=_uid),0),
    'streak_current', COALESCE((SELECT current_streak FROM public.reading_streaks WHERE user_id=_uid),0),
    'streak_longest', COALESCE((SELECT longest_streak FROM public.reading_streaks WHERE user_id=_uid),0),
    'badges', COALESCE((SELECT jsonb_agg(jsonb_build_object('code',ub.badge_code,'awarded_at',ub.awarded_at,'is_equipped',ub.is_equipped)) FROM public.user_badges ub WHERE ub.user_id=_uid),'[]'::jsonb),
    'achievements', COALESCE((SELECT jsonb_agg(jsonb_build_object('code',ua.achievement_code,'unlocked_at',ua.unlocked_at)) FROM public.user_achievements ua WHERE ua.user_id=_uid),'[]'::jsonb),
    'unopened_boxes', COALESCE((SELECT count(*) FROM public.reward_boxes WHERE user_id=_uid AND opened=false),0)
  ) INTO _r;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.gm_my_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_my_profile() TO authenticated;

-- ---------- gm_my_missions ----------
CREATE OR REPLACE FUNCTION public.gm_my_missions()
RETURNS TABLE(code text, title_ar text, title_en text, target_kind text, target_value int, xp int, coins int, progress int, completed boolean, claimed boolean)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _today date := (now() AT TIME ZONE 'UTC')::date;
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  RETURN QUERY
  SELECT m.code, m.title_ar, m.title_en, m.target_kind, m.target_value, m.xp, m.coins,
         COALESCE(u.progress,0), COALESCE(u.completed,false), COALESCE(u.claimed,false)
  FROM public.daily_missions m
  LEFT JOIN public.user_daily_missions u ON u.mission_code=m.code AND u.user_id=_uid AND u.day=_today
  WHERE m.enabled ORDER BY m.sort_order, m.code;
END $$;
REVOKE ALL ON FUNCTION public.gm_my_missions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_my_missions() TO authenticated;

-- ---------- gm_grant_box (award a random box on trigger events; helper) ----------
CREATE OR REPLACE FUNCTION public.gm_grant_box(_source text DEFAULT 'reading')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid(); _id uuid;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  INSERT INTO public.reward_boxes(user_id, source) VALUES (_uid, _source) RETURNING id INTO _id;
  RETURN _id;
END $$;
REVOKE ALL ON FUNCTION public.gm_grant_box(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gm_grant_box(text) TO authenticated;
