
-- ========== FAVNOL GAMIFICATION — PHASE A: SCHEMA ==========
-- Additive only. No existing tables touched.

-- ---------- user_xp ----------
CREATE TABLE public.user_xp (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  total_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_xp TO authenticated, anon;
GRANT ALL ON public.user_xp TO service_role;
ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_xp public read" ON public.user_xp FOR SELECT USING (true);

-- ---------- xp_rules ----------
CREATE TABLE public.xp_rules (
  code text PRIMARY KEY,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  daily_cap integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.xp_rules TO authenticated, anon;
GRANT ALL ON public.xp_rules TO service_role;
ALTER TABLE public.xp_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_rules public read enabled" ON public.xp_rules FOR SELECT USING (enabled = true);
CREATE POLICY "xp_rules admin all" ON public.xp_rules FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.xp_rules(code, xp, coins, daily_cap) VALUES
  ('signup', 100, 50, 1),
  ('daily_login', 10, 5, 1),
  ('read_chapter', 5, 1, 30),
  ('finish_chapter', 10, 2, 30),
  ('comment', 5, 1, 10),
  ('receive_like', 2, 0, 50),
  ('share_novel', 5, 1, 5),
  ('rate_novel', 10, 2, 5),
  ('bookmark', 3, 0, 10),
  ('invite', 100, 100, 20),
  ('invited', 50, 50, 1),
  ('publish_novel', 200, 50, 5),
  ('publish_chapter', 30, 5, 20)
ON CONFLICT (code) DO NOTHING;

-- ---------- xp_events (ledger) ----------
CREATE TABLE public.xp_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  ref_key text,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, code, ref_key)
);
CREATE INDEX xp_events_user_day_idx ON public.xp_events(user_id, day);
CREATE INDEX xp_events_user_code_day_idx ON public.xp_events(user_id, code, day);
GRANT SELECT ON public.xp_events TO authenticated;
GRANT ALL ON public.xp_events TO service_role;
ALTER TABLE public.xp_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "xp_events self read" ON public.xp_events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "xp_events admin read" ON public.xp_events FOR SELECT USING (public.has_any_admin_role(auth.uid()));

-- ---------- badges ----------
CREATE TABLE public.badges (
  code text PRIMARY KEY,
  title_ar text NOT NULL,
  title_en text,
  description text,
  icon text,
  rarity text NOT NULL DEFAULT 'common',
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.badges TO authenticated, anon;
GRANT ALL ON public.badges TO service_role;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badges public read" ON public.badges FOR SELECT USING (enabled = true);
CREATE POLICY "badges admin all" ON public.badges FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.badges(code, title_ar, title_en, icon, rarity) VALUES
  ('reader', 'قارئ', 'Reader', '📖', 'common'),
  ('elite_reader', 'قارئ نخبة', 'Elite Reader', '🏆', 'rare'),
  ('streak_master', 'سيد المواظبة', 'Streak Master', '🔥', 'rare'),
  ('legend', 'أسطورة', 'Legend', '👑', 'legendary'),
  ('vip', 'VIP', 'VIP', '💎', 'epic'),
  ('author', 'كاتب', 'Author', '✍️', 'common'),
  ('verified_author', 'كاتب موثق', 'Verified Author', '⭐', 'epic')
ON CONFLICT (code) DO NOTHING;

-- ---------- user_badges ----------
CREATE TABLE public.user_badges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_code text NOT NULL REFERENCES public.badges(code) ON DELETE CASCADE,
  awarded_at timestamptz NOT NULL DEFAULT now(),
  is_equipped boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, badge_code)
);
GRANT SELECT ON public.user_badges TO authenticated, anon;
GRANT UPDATE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges public read" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "user_badges self equip" ON public.user_badges FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ---------- achievements ----------
CREATE TABLE public.achievements (
  code text PRIMARY KEY,
  title_ar text NOT NULL,
  title_en text,
  description_ar text,
  description_en text,
  icon text,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  badge_code text REFERENCES public.badges(code) ON DELETE SET NULL,
  threshold_kind text NOT NULL,
  threshold_value integer NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.achievements TO authenticated, anon;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "achievements public read" ON public.achievements FOR SELECT USING (enabled = true);
CREATE POLICY "achievements admin all" ON public.achievements FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.achievements(code, title_ar, title_en, icon, xp, coins, threshold_kind, threshold_value, badge_code) VALUES
  ('first_chapter', 'أول فصل', 'First Chapter', '🎯', 20, 5, 'chapters_read', 1, 'reader'),
  ('read_100', '100 فصل', '100 Chapters', '📚', 200, 50, 'chapters_read', 100, 'reader'),
  ('read_1000', '1000 فصل', '1000 Chapters', '📖', 2000, 500, 'chapters_read', 1000, 'elite_reader'),
  ('first_comment', 'أول تعليق', 'First Comment', '💬', 10, 2, 'comments', 1, NULL),
  ('comments_100', '100 تعليق', '100 Comments', '🗣️', 200, 50, 'comments', 100, NULL),
  ('first_novel', 'أول رواية', 'First Novel', '✒️', 500, 100, 'novels_published', 1, 'author'),
  ('perfect_week', 'أسبوع مثالي', 'Perfect Week', '⚡', 100, 50, 'streak_days', 7, 'streak_master'),
  ('streak_365', 'سنة كاملة', '365 Day Streak', '🏅', 5000, 1000, 'streak_days', 365, 'legend')
ON CONFLICT (code) DO NOTHING;

-- ---------- user_achievements ----------
CREATE TABLE public.user_achievements (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_code text NOT NULL REFERENCES public.achievements(code) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, achievement_code)
);
GRANT SELECT ON public.user_achievements TO authenticated, anon;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_achievements public read" ON public.user_achievements FOR SELECT USING (true);

-- ---------- daily_missions ----------
CREATE TABLE public.daily_missions (
  code text PRIMARY KEY,
  title_ar text NOT NULL,
  title_en text,
  target_kind text NOT NULL,
  target_value integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0
);
GRANT SELECT ON public.daily_missions TO authenticated, anon;
GRANT ALL ON public.daily_missions TO service_role;
ALTER TABLE public.daily_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_missions public read" ON public.daily_missions FOR SELECT USING (enabled = true);
CREATE POLICY "daily_missions admin all" ON public.daily_missions FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.daily_missions(code, title_ar, title_en, target_kind, target_value, xp, coins) VALUES
  ('read5', 'اقرأ 5 فصول', 'Read 5 Chapters', 'read_chapter', 5, 50, 10),
  ('comment1', 'اكتب تعليقاً', 'Post a Comment', 'comment', 1, 20, 5),
  ('rate1', 'قيّم رواية', 'Rate a Novel', 'rate_novel', 1, 20, 5),
  ('share1', 'شارك رواية', 'Share a Novel', 'share_novel', 1, 15, 3),
  ('login1', 'تسجيل الدخول', 'Daily Login', 'daily_login', 1, 10, 5)
ON CONFLICT (code) DO NOTHING;

-- ---------- user_daily_missions ----------
CREATE TABLE public.user_daily_missions (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mission_code text NOT NULL REFERENCES public.daily_missions(code) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, mission_code, day)
);
CREATE INDEX udm_user_day_idx ON public.user_daily_missions(user_id, day);
GRANT SELECT ON public.user_daily_missions TO authenticated;
GRANT ALL ON public.user_daily_missions TO service_role;
ALTER TABLE public.user_daily_missions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "udm self read" ON public.user_daily_missions FOR SELECT USING (auth.uid() = user_id);

-- ---------- weekly_challenges ----------
CREATE TABLE public.weekly_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_en text,
  target_kind text NOT NULL,
  target_value integer NOT NULL DEFAULT 1,
  xp integer NOT NULL DEFAULT 0,
  coins integer NOT NULL DEFAULT 0,
  starts_at timestamptz NOT NULL DEFAULT date_trunc('week', now()),
  ends_at timestamptz NOT NULL DEFAULT date_trunc('week', now()) + interval '7 days',
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.weekly_challenges TO authenticated, anon;
GRANT ALL ON public.weekly_challenges TO service_role;
ALTER TABLE public.weekly_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wc public read" ON public.weekly_challenges FOR SELECT USING (enabled = true);
CREATE POLICY "wc admin all" ON public.weekly_challenges FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TABLE public.user_weekly_challenges (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_id uuid NOT NULL REFERENCES public.weekly_challenges(id) ON DELETE CASCADE,
  progress integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  claimed boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, challenge_id)
);
GRANT SELECT ON public.user_weekly_challenges TO authenticated;
GRANT ALL ON public.user_weekly_challenges TO service_role;
ALTER TABLE public.user_weekly_challenges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "uwc self read" ON public.user_weekly_challenges FOR SELECT USING (auth.uid() = user_id);

-- ---------- reward boxes ----------
CREATE TABLE public.reward_box_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  weight integer NOT NULL DEFAULT 1,
  reward jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true
);
GRANT SELECT ON public.reward_box_pool TO authenticated;
GRANT ALL ON public.reward_box_pool TO service_role;
ALTER TABLE public.reward_box_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rbp read auth" ON public.reward_box_pool FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "rbp admin all" ON public.reward_box_pool FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.reward_box_pool(label, weight, reward) VALUES
  ('5 coins', 50, '{"coins":5}'::jsonb),
  ('15 coins', 30, '{"coins":15}'::jsonb),
  ('50 coins', 10, '{"coins":50}'::jsonb),
  ('25 xp', 40, '{"xp":25}'::jsonb),
  ('100 xp', 15, '{"xp":100}'::jsonb),
  ('rare badge', 2, '{"badge":"streak_master"}'::jsonb),
  ('vip day', 3, '{"vip_days":1}'::jsonb);

CREATE TABLE public.reward_boxes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'reading',
  opened boolean NOT NULL DEFAULT false,
  reward jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz
);
CREATE INDEX rb_user_idx ON public.reward_boxes(user_id, opened);
GRANT SELECT ON public.reward_boxes TO authenticated;
GRANT ALL ON public.reward_boxes TO service_role;
ALTER TABLE public.reward_boxes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rb self read" ON public.reward_boxes FOR SELECT USING (auth.uid() = user_id);

-- ---------- referrals ----------
CREATE TABLE public.referral_codes (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated, anon;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rc public read" ON public.referral_codes FOR SELECT USING (true);

CREATE TABLE public.referrals (
  invitee_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  rewarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ref_inviter_idx ON public.referrals(inviter_id);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals self read" ON public.referrals FOR SELECT
  USING (auth.uid() = inviter_id OR auth.uid() = invitee_id);

-- ---------- leaderboard snapshots ----------
CREATE TABLE public.leaderboard_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  metric text NOT NULL,
  user_id uuid NOT NULL,
  score bigint NOT NULL DEFAULT 0,
  rank integer NOT NULL,
  computed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX lbs_lookup_idx ON public.leaderboard_snapshots(period, metric, rank);
GRANT SELECT ON public.leaderboard_snapshots TO authenticated, anon;
GRANT ALL ON public.leaderboard_snapshots TO service_role;
ALTER TABLE public.leaderboard_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lbs public read" ON public.leaderboard_snapshots FOR SELECT USING (true);

-- ---------- seasons ----------
CREATE TABLE public.season_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ar text NOT NULL,
  title_en text,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.season_events TO authenticated, anon;
GRANT ALL ON public.season_events TO service_role;
ALTER TABLE public.season_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons public read" ON public.season_events FOR SELECT USING (enabled = true);
CREATE POLICY "seasons admin all" ON public.season_events FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

CREATE TABLE public.user_season_progress (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id uuid NOT NULL REFERENCES public.season_events(id) ON DELETE CASCADE,
  xp integer NOT NULL DEFAULT 0,
  tier integer NOT NULL DEFAULT 0,
  claimed_tiers integer[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);
GRANT SELECT ON public.user_season_progress TO authenticated;
GRANT ALL ON public.user_season_progress TO service_role;
ALTER TABLE public.user_season_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "usp self read" ON public.user_season_progress FOR SELECT USING (auth.uid() = user_id);

-- ---------- reputation ----------
CREATE TABLE public.reputation (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'newcomer',
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.reputation TO authenticated, anon;
GRANT ALL ON public.reputation TO service_role;
ALTER TABLE public.reputation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reputation public read" ON public.reputation FOR SELECT USING (true);
