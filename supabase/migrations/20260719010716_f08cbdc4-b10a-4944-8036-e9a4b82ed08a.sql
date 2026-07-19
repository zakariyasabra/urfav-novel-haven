
-- ============================================================================
-- BATCH 7B · Battle Pass (extends missions) + Messaging backend
-- ============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 1. BATTLE PASS — extend season_events, missions, challenges
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.season_events
  ADD COLUMN IF NOT EXISTS slug              text UNIQUE,
  ADD COLUMN IF NOT EXISTS description_ar    text,
  ADD COLUMN IF NOT EXISTS description_en    text,
  ADD COLUMN IF NOT EXISTS cover_url         text,
  ADD COLUMN IF NOT EXISTS max_tier          integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS xp_per_tier       integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS premium_price_coins integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_battle_pass    boolean NOT NULL DEFAULT true;

ALTER TABLE public.daily_missions
  ADD COLUMN IF NOT EXISTS season_id            uuid REFERENCES public.season_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS battle_pass_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_xp            integer NOT NULL DEFAULT 0;

ALTER TABLE public.weekly_challenges
  ADD COLUMN IF NOT EXISTS season_id            uuid REFERENCES public.season_events(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS battle_pass_enabled  boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS season_xp            integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_daily_missions_season   ON public.daily_missions(season_id) WHERE season_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_weekly_challenges_season ON public.weekly_challenges(season_id) WHERE season_id IS NOT NULL;

-- Battle Pass tier table
CREATE TABLE IF NOT EXISTS public.battle_pass_tiers (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id       uuid NOT NULL REFERENCES public.season_events(id) ON DELETE CASCADE,
  tier            integer NOT NULL CHECK (tier >= 1),
  xp_required     integer NOT NULL CHECK (xp_required >= 0),
  free_reward     jsonb NOT NULL DEFAULT '{}'::jsonb,   -- {coins:100, xp:50, item_id:"...", title_ar:"..."}
  premium_reward  jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, tier)
);
GRANT SELECT ON public.battle_pass_tiers TO anon, authenticated;
GRANT ALL    ON public.battle_pass_tiers TO service_role;
ALTER TABLE  public.battle_pass_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bp_tiers_public_read"  ON public.battle_pass_tiers FOR SELECT USING (true);
CREATE POLICY "bp_tiers_admin_write"  ON public.battle_pass_tiers FOR ALL
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

-- Premium track ownership
CREATE TABLE IF NOT EXISTS public.battle_pass_ownership (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id   uuid NOT NULL REFERENCES public.season_events(id) ON DELETE CASCADE,
  source      text NOT NULL DEFAULT 'purchase' CHECK (source IN ('purchase','grant','gift','promo')),
  granted_by  uuid,
  granted_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, season_id)
);
GRANT SELECT, INSERT ON public.battle_pass_ownership TO authenticated;
GRANT ALL             ON public.battle_pass_ownership TO service_role;
ALTER TABLE           public.battle_pass_ownership ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bp_own_read_self"  ON public.battle_pass_ownership FOR SELECT
  USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

-- ────────────────────────────────────────────────────────────────────────────
-- 2. TRIGGER — credit season XP on mission/challenge claim
-- ────────────────────────────────────────────────────────────────────────────
-- Reuses existing claim flow. Only credits when the row transitions to claimed=true.

CREATE OR REPLACE FUNCTION public._bp_credit_from_daily()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  now_ts timestamptz := now();
BEGIN
  IF NEW.claimed IS TRUE AND (OLD.claimed IS DISTINCT FROM TRUE) THEN
    SELECT dm.season_id, dm.battle_pass_enabled, dm.season_xp
      INTO m
      FROM public.daily_missions dm
     WHERE dm.code = NEW.mission_code
     LIMIT 1;
    IF m.season_id IS NOT NULL AND m.battle_pass_enabled AND m.season_xp > 0 THEN
      -- Only credit if season is currently active
      IF EXISTS (SELECT 1 FROM public.season_events s
                  WHERE s.id = m.season_id AND s.enabled = true
                    AND now_ts BETWEEN s.starts_at AND s.ends_at) THEN
        INSERT INTO public.user_season_progress(user_id, season_id, xp, tier, claimed_tiers, updated_at)
        VALUES (NEW.user_id, m.season_id, m.season_xp, 0, ARRAY[]::integer[], now_ts)
        ON CONFLICT (user_id, season_id) DO UPDATE
          SET xp = public.user_season_progress.xp + EXCLUDED.xp,
              updated_at = now_ts;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._bp_credit_from_daily() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bp_credit_daily ON public.user_daily_missions;
CREATE TRIGGER trg_bp_credit_daily
AFTER UPDATE OF claimed ON public.user_daily_missions
FOR EACH ROW EXECUTE FUNCTION public._bp_credit_from_daily();

CREATE OR REPLACE FUNCTION public._bp_credit_from_weekly()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m record;
  now_ts timestamptz := now();
BEGIN
  IF NEW.claimed IS TRUE AND (OLD.claimed IS DISTINCT FROM TRUE) THEN
    SELECT wc.season_id, wc.battle_pass_enabled, wc.season_xp
      INTO m
      FROM public.weekly_challenges wc
     WHERE wc.id = NEW.challenge_id
     LIMIT 1;
    IF m.season_id IS NOT NULL AND m.battle_pass_enabled AND m.season_xp > 0 THEN
      IF EXISTS (SELECT 1 FROM public.season_events s
                  WHERE s.id = m.season_id AND s.enabled = true
                    AND now_ts BETWEEN s.starts_at AND s.ends_at) THEN
        INSERT INTO public.user_season_progress(user_id, season_id, xp, tier, claimed_tiers, updated_at)
        VALUES (NEW.user_id, m.season_id, m.season_xp, 0, ARRAY[]::integer[], now_ts)
        ON CONFLICT (user_id, season_id) DO UPDATE
          SET xp = public.user_season_progress.xp + EXCLUDED.xp,
              updated_at = now_ts;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._bp_credit_from_weekly() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_bp_credit_weekly ON public.user_weekly_challenges;
CREATE TRIGGER trg_bp_credit_weekly
AFTER UPDATE OF claimed ON public.user_weekly_challenges
FOR EACH ROW EXECUTE FUNCTION public._bp_credit_from_weekly();

-- ────────────────────────────────────────────────────────────────────────────
-- 3. BATTLE PASS RPCs
-- ────────────────────────────────────────────────────────────────────────────

-- Active season
CREATE OR REPLACE FUNCTION public.bp_active_season()
RETURNS TABLE (
  id uuid, slug text, title_ar text, title_en text,
  description_ar text, description_en text, cover_url text,
  starts_at timestamptz, ends_at timestamptz,
  max_tier int, xp_per_tier int, premium_price_coins int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT s.id, s.slug, s.title_ar, s.title_en, s.description_ar, s.description_en,
         s.cover_url, s.starts_at, s.ends_at,
         s.max_tier, s.xp_per_tier, s.premium_price_coins
    FROM public.season_events s
   WHERE s.enabled = true AND s.is_battle_pass = true
     AND now() BETWEEN s.starts_at AND s.ends_at
   ORDER BY s.starts_at DESC
   LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.bp_active_season() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bp_active_season() TO anon, authenticated;

-- My progress for a season
CREATE OR REPLACE FUNCTION public.bp_my_progress(_season_id uuid)
RETURNS TABLE (
  season_id uuid, xp int, tier int, claimed_tiers int[], has_premium boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.season_id,
         COALESCE(p.xp, 0),
         COALESCE(p.tier, 0),
         COALESCE(p.claimed_tiers, ARRAY[]::integer[]),
         EXISTS (SELECT 1 FROM public.battle_pass_ownership o
                  WHERE o.user_id = auth.uid() AND o.season_id = _season_id)
    FROM (SELECT _season_id AS season_id) x
    LEFT JOIN public.user_season_progress p
      ON p.season_id = _season_id AND p.user_id = auth.uid();
$$;
REVOKE ALL ON FUNCTION public.bp_my_progress(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bp_my_progress(uuid) TO authenticated;

-- Purchase premium track (deducts coins via wallet)
CREATE OR REPLACE FUNCTION public.bp_purchase_premium(_season_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  price int;
  bal int;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT premium_price_coins INTO price
    FROM public.season_events
   WHERE id = _season_id AND enabled = true AND is_battle_pass = true
     AND now() BETWEEN starts_at AND ends_at
   FOR UPDATE;
  IF price IS NULL THEN RAISE EXCEPTION 'season_not_active'; END IF;
  IF EXISTS (SELECT 1 FROM public.battle_pass_ownership WHERE user_id = uid AND season_id = _season_id) THEN
    RETURN true;
  END IF;
  IF price > 0 THEN
    SELECT coins INTO bal FROM public.wallets WHERE user_id = uid FOR UPDATE;
    IF COALESCE(bal, 0) < price THEN RAISE EXCEPTION 'insufficient_coins'; END IF;
    UPDATE public.wallets SET coins = coins - price WHERE user_id = uid;
    INSERT INTO public.coin_transactions(user_id, amount, reason, meta)
    VALUES (uid, -price, 'battle_pass_premium', jsonb_build_object('season_id', _season_id));
  END IF;
  INSERT INTO public.battle_pass_ownership(user_id, season_id, source)
  VALUES (uid, _season_id, 'purchase')
  ON CONFLICT (user_id, season_id) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.bp_purchase_premium(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bp_purchase_premium(uuid) TO authenticated;

-- Claim a tier reward (free + premium if owned). Reuses _gm_apply_reward.
CREATE OR REPLACE FUNCTION public.bp_claim_tier(_season_id uuid, _tier int)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  prog record;
  tier_row record;
  has_prem boolean;
  granted jsonb := '{}'::jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;

  SELECT * INTO tier_row FROM public.battle_pass_tiers
   WHERE season_id = _season_id AND tier = _tier;
  IF NOT FOUND THEN RAISE EXCEPTION 'tier_not_found'; END IF;

  SELECT xp, claimed_tiers INTO prog FROM public.user_season_progress
   WHERE user_id = uid AND season_id = _season_id FOR UPDATE;
  IF NOT FOUND OR COALESCE(prog.xp, 0) < tier_row.xp_required THEN
    RAISE EXCEPTION 'tier_locked';
  END IF;
  IF _tier = ANY(COALESCE(prog.claimed_tiers, ARRAY[]::integer[])) THEN
    RAISE EXCEPTION 'already_claimed';
  END IF;

  has_prem := EXISTS (SELECT 1 FROM public.battle_pass_ownership
                       WHERE user_id = uid AND season_id = _season_id);

  -- Apply free reward
  IF tier_row.free_reward IS NOT NULL AND tier_row.free_reward <> '{}'::jsonb THEN
    PERFORM public._gm_apply_reward(uid, tier_row.free_reward);
    granted := granted || jsonb_build_object('free', tier_row.free_reward);
  END IF;
  -- Apply premium reward (if owned)
  IF has_prem AND tier_row.premium_reward IS NOT NULL AND tier_row.premium_reward <> '{}'::jsonb THEN
    PERFORM public._gm_apply_reward(uid, tier_row.premium_reward);
    granted := granted || jsonb_build_object('premium', tier_row.premium_reward);
  END IF;

  UPDATE public.user_season_progress
     SET claimed_tiers = array_append(COALESCE(claimed_tiers, ARRAY[]::integer[]), _tier),
         tier = GREATEST(tier, _tier),
         updated_at = now()
   WHERE user_id = uid AND season_id = _season_id;

  -- Existing notification system
  INSERT INTO public.notifications(user_id, type, category, title, title_ar, body, body_ar, meta)
  VALUES (
    uid, 'battle_pass_reward', 'battle_pass',
    'Battle Pass tier claimed', 'تم استلام مكافأة المستوى',
    'You claimed tier ' || _tier, 'استلمت مكافأة المستوى ' || _tier,
    jsonb_build_object('season_id', _season_id, 'tier', _tier, 'granted', granted)
  );

  RETURN jsonb_build_object('ok', true, 'tier', _tier, 'granted', granted, 'premium', has_prem);
END;
$$;
REVOKE ALL ON FUNCTION public.bp_claim_tier(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bp_claim_tier(uuid,int) TO authenticated;

-- Admin: grant premium track
CREATE OR REPLACE FUNCTION public.bp_admin_grant_premium(_user_id uuid, _season_id uuid, _source text DEFAULT 'grant')
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.battle_pass_ownership(user_id, season_id, source, granted_by)
  VALUES (_user_id, _season_id, COALESCE(_source, 'grant'), auth.uid())
  ON CONFLICT (user_id, season_id) DO NOTHING;
  INSERT INTO public.audit_logs(actor_id, action, target_type, target_id, meta)
  VALUES (auth.uid(), 'bp_grant_premium', 'user', _user_id::text,
          jsonb_build_object('season_id', _season_id, 'source', _source));
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.bp_admin_grant_premium(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bp_admin_grant_premium(uuid,uuid,text) TO authenticated;

-- ============================================================================
-- 4. MESSAGING — provider-agnostic communication layer
-- ============================================================================

-- Kind enum via CHECK (avoids future enum drift pain)
CREATE TABLE IF NOT EXISTS public.conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            text NOT NULL CHECK (kind IN ('dm','author_reader','admin_user','support')),
  subject         text,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_message_at timestamptz,
  closed_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.conversations TO authenticated;
GRANT ALL            ON public.conversations TO service_role;
ALTER TABLE          public.conversations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.conversation_participants (
  conversation_id       uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role                  text NOT NULL DEFAULT 'member' CHECK (role IN ('member','author','admin')),
  joined_at             timestamptz NOT NULL DEFAULT now(),
  last_read_at          timestamptz,
  muted_until           timestamptz,
  archived_at           timestamptz,
  notifications_enabled boolean NOT NULL DEFAULT true,
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, UPDATE ON public.conversation_participants TO authenticated;
GRANT ALL            ON public.conversation_participants TO service_role;
ALTER TABLE          public.conversation_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_conv_part_user ON public.conversation_participants(user_id, archived_at NULLS FIRST);
CREATE INDEX IF NOT EXISTS idx_conv_last_msg  ON public.conversations(last_message_at DESC NULLS LAST) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  kind            text NOT NULL DEFAULT 'text' CHECK (kind IN ('text','system','attachment')),
  body            text,
  meta            jsonb NOT NULL DEFAULT '{}'::jsonb,
  edited_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.messages TO authenticated;
GRANT ALL    ON public.messages TO service_role;
ALTER TABLE  public.messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_conv_time ON public.messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_body_trgm ON public.messages USING gin (body gin_trgm_ops)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.message_reactions (
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji      text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.message_reactions TO authenticated;
GRANT ALL                    ON public.message_reactions TO service_role;
ALTER TABLE                  public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.message_attachments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  kind        text NOT NULL DEFAULT 'file' CHECK (kind IN ('file','image','audio','video')),
  url         text NOT NULL,
  mime        text,
  size_bytes  bigint,
  meta        jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.message_attachments TO authenticated;
GRANT ALL            ON public.message_attachments TO service_role;
ALTER TABLE          public.message_attachments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_blocks (
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  reason     text,
  PRIMARY KEY (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO authenticated;
GRANT ALL                    ON public.user_blocks TO service_role;
ALTER TABLE                  public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_blocks_owner" ON public.user_blocks FOR ALL
  USING (blocker_id = auth.uid())
  WITH CHECK (blocker_id = auth.uid());

-- Membership helper (SECURITY DEFINER; avoids recursive RLS)
CREATE OR REPLACE FUNCTION public._msg_is_participant(_conv uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_participants
     WHERE conversation_id = _conv AND user_id = _uid
  );
$$;
REVOKE ALL ON FUNCTION public._msg_is_participant(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public._msg_is_participant(uuid,uuid) TO authenticated;

-- RLS policies (read own conversations + messages; admins read all)
CREATE POLICY "conv_read_participant" ON public.conversations FOR SELECT
  USING (deleted_at IS NULL AND (
    public._msg_is_participant(id, auth.uid())
    OR public.has_any_admin_role(auth.uid())
  ));

CREATE POLICY "conv_part_read_self" ON public.conversation_participants FOR SELECT
  USING (user_id = auth.uid() OR public._msg_is_participant(conversation_id, auth.uid())
         OR public.has_any_admin_role(auth.uid()));

-- Participants can update ONLY their own row (mute/archive/read state)
CREATE POLICY "conv_part_update_self" ON public.conversation_participants FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "messages_read_participant" ON public.messages FOR SELECT
  USING (public._msg_is_participant(conversation_id, auth.uid())
         OR public.has_any_admin_role(auth.uid()));

CREATE POLICY "reactions_read_participant" ON public.message_reactions FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.messages m
                  WHERE m.id = message_id
                    AND public._msg_is_participant(m.conversation_id, auth.uid())));

CREATE POLICY "reactions_own" ON public.message_reactions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "attachments_read_participant" ON public.message_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.messages m
                  WHERE m.id = message_id
                    AND public._msg_is_participant(m.conversation_id, auth.uid())));

-- ────────────────────────────────────────────────────────────────────────────
-- 5. MESSAGING RPCs — the client contract
-- ────────────────────────────────────────────────────────────────────────────

-- Start a DM (dedupes existing 1:1 conversation)
CREATE OR REPLACE FUNCTION public.msg_start_dm(_other_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv uuid;
BEGIN
  IF uid IS NULL OR _other_user_id IS NULL OR uid = _other_user_id THEN
    RAISE EXCEPTION 'invalid_target';
  END IF;
  IF EXISTS (SELECT 1 FROM public.user_blocks
              WHERE (blocker_id = _other_user_id AND blocked_id = uid)
                 OR (blocker_id = uid AND blocked_id = _other_user_id)) THEN
    RAISE EXCEPTION 'blocked';
  END IF;

  -- Find existing 1:1 DM between exactly these two users
  SELECT c.id INTO conv
    FROM public.conversations c
   WHERE c.kind = 'dm' AND c.deleted_at IS NULL
     AND (SELECT COUNT(*) FROM public.conversation_participants p WHERE p.conversation_id = c.id) = 2
     AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = uid)
     AND EXISTS (SELECT 1 FROM public.conversation_participants p WHERE p.conversation_id = c.id AND p.user_id = _other_user_id)
   LIMIT 1;
  IF conv IS NOT NULL THEN RETURN conv; END IF;

  INSERT INTO public.conversations(kind, created_by) VALUES ('dm', uid) RETURNING id INTO conv;
  INSERT INTO public.conversation_participants(conversation_id, user_id) VALUES (conv, uid), (conv, _other_user_id);
  RETURN conv;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_start_dm(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_start_dm(uuid) TO authenticated;

-- Admin: open a conversation with a user
CREATE OR REPLACE FUNCTION public.msg_admin_open_with_user(_user_id uuid, _subject text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  conv uuid;
BEGIN
  IF NOT public.has_any_admin_role(uid) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.conversations(kind, subject, created_by) VALUES ('admin_user', _subject, uid) RETURNING id INTO conv;
  INSERT INTO public.conversation_participants(conversation_id, user_id, role)
  VALUES (conv, uid, 'admin'), (conv, _user_id, 'member');
  RETURN conv;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_admin_open_with_user(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_admin_open_with_user(uuid,text) TO authenticated;

-- Send a message (spam-filter + block check + updates conversation timestamp + notifies recipients)
CREATE OR REPLACE FUNCTION public.msg_send(_conversation_id uuid, _body text, _kind text DEFAULT 'text', _meta jsonb DEFAULT '{}'::jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  msg_id uuid;
  conv_kind text;
  clean text := btrim(COALESCE(_body,''));
  other_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT public._msg_is_participant(_conversation_id, uid) THEN RAISE EXCEPTION 'not_a_participant'; END IF;
  IF _kind = 'text' AND (clean = '' OR length(clean) > 4000) THEN RAISE EXCEPTION 'invalid_body'; END IF;

  -- Block check for DMs
  SELECT c.kind INTO conv_kind FROM public.conversations c WHERE c.id = _conversation_id;
  IF conv_kind = 'dm' THEN
    SELECT p.user_id INTO other_id FROM public.conversation_participants p
      WHERE p.conversation_id = _conversation_id AND p.user_id <> uid LIMIT 1;
    IF other_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_blocks
       WHERE (blocker_id = other_id AND blocked_id = uid)
          OR (blocker_id = uid AND blocked_id = other_id)
    ) THEN RAISE EXCEPTION 'blocked'; END IF;
  END IF;

  -- Reuse existing spam_words table (best-effort; not fatal if table is empty)
  IF _kind = 'text' AND EXISTS (
    SELECT 1 FROM public.spam_words sw
     WHERE sw.enabled = true AND lower(clean) LIKE '%' || lower(sw.word) || '%'
  ) THEN
    RAISE EXCEPTION 'spam_blocked';
  END IF;

  INSERT INTO public.messages(conversation_id, sender_id, kind, body, meta)
  VALUES (_conversation_id, uid, _kind, CASE WHEN _kind='text' THEN clean ELSE _body END, COALESCE(_meta,'{}'::jsonb))
  RETURNING id INTO msg_id;

  UPDATE public.conversations
     SET last_message_at = now(), updated_at = now()
   WHERE id = _conversation_id;

  -- Notify all other participants that are not muted
  INSERT INTO public.notifications(user_id, type, category, title, title_ar, body, body_ar, link, meta)
  SELECT p.user_id, 'new_message', 'system',
         'New message', 'رسالة جديدة',
         left(clean, 140), left(clean, 140),
         '/messages/' || _conversation_id::text,
         jsonb_build_object('conversation_id', _conversation_id, 'message_id', msg_id, 'sender_id', uid)
    FROM public.conversation_participants p
   WHERE p.conversation_id = _conversation_id
     AND p.user_id <> uid
     AND p.notifications_enabled = true
     AND (p.muted_until IS NULL OR p.muted_until < now());

  RETURN msg_id;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_send(uuid,text,text,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_send(uuid,text,text,jsonb) TO authenticated;

-- Soft delete a message (only sender or admin)
CREATE OR REPLACE FUNCTION public.msg_soft_delete_message(_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE uid uuid := auth.uid(); ok boolean := false;
BEGIN
  UPDATE public.messages
     SET deleted_at = now(), body = NULL
   WHERE id = _message_id
     AND (sender_id = uid OR public.has_any_admin_role(uid));
  GET DIAGNOSTICS ok = ROW_COUNT;
  RETURN ok;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_soft_delete_message(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_soft_delete_message(uuid) TO authenticated;

-- List my conversations with last message preview + unread count
CREATE OR REPLACE FUNCTION public.msg_list_conversations(_include_archived boolean DEFAULT false, _limit int DEFAULT 50)
RETURNS TABLE (
  conversation_id uuid, kind text, subject text,
  last_message_at timestamptz, last_body text, last_sender_id uuid,
  unread_count int, archived boolean, muted boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH mine AS (
    SELECT p.conversation_id, p.last_read_at, p.archived_at, p.muted_until
      FROM public.conversation_participants p
     WHERE p.user_id = auth.uid()
       AND (_include_archived OR p.archived_at IS NULL)
  ),
  latest AS (
    SELECT DISTINCT ON (m.conversation_id) m.conversation_id, m.created_at, m.body, m.sender_id
      FROM public.messages m
      JOIN mine ON mine.conversation_id = m.conversation_id
     WHERE m.deleted_at IS NULL
     ORDER BY m.conversation_id, m.created_at DESC
  )
  SELECT c.id, c.kind, c.subject,
         c.last_message_at, latest.body, latest.sender_id,
         (SELECT COUNT(*)::int FROM public.messages m2
           WHERE m2.conversation_id = c.id
             AND m2.deleted_at IS NULL
             AND m2.sender_id <> auth.uid()
             AND (mine.last_read_at IS NULL OR m2.created_at > mine.last_read_at)),
         mine.archived_at IS NOT NULL,
         mine.muted_until IS NOT NULL AND mine.muted_until > now()
    FROM public.conversations c
    JOIN mine ON mine.conversation_id = c.id
    LEFT JOIN latest ON latest.conversation_id = c.id
   WHERE c.deleted_at IS NULL
   ORDER BY c.last_message_at DESC NULLS LAST
   LIMIT _limit;
$$;
REVOKE ALL ON FUNCTION public.msg_list_conversations(boolean,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_list_conversations(boolean,int) TO authenticated;

-- Message page (cursor pagination by created_at)
CREATE OR REPLACE FUNCTION public.msg_list_messages(_conversation_id uuid, _before timestamptz DEFAULT NULL, _limit int DEFAULT 50)
RETURNS TABLE (id uuid, sender_id uuid, kind text, body text, meta jsonb, edited_at timestamptz, deleted_at timestamptz, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.sender_id, m.kind, m.body, m.meta, m.edited_at, m.deleted_at, m.created_at
    FROM public.messages m
   WHERE m.conversation_id = _conversation_id
     AND public._msg_is_participant(_conversation_id, auth.uid())
     AND (_before IS NULL OR m.created_at < _before)
   ORDER BY m.created_at DESC
   LIMIT LEAST(GREATEST(_limit,1), 200);
$$;
REVOKE ALL ON FUNCTION public.msg_list_messages(uuid,timestamptz,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_list_messages(uuid,timestamptz,int) TO authenticated;

-- Search within my conversations
CREATE OR REPLACE FUNCTION public.msg_search(_q text, _limit int DEFAULT 30)
RETURNS TABLE (message_id uuid, conversation_id uuid, sender_id uuid, body text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT m.id, m.conversation_id, m.sender_id, m.body, m.created_at
    FROM public.messages m
    JOIN public.conversation_participants p
      ON p.conversation_id = m.conversation_id AND p.user_id = auth.uid()
   WHERE m.deleted_at IS NULL
     AND _q IS NOT NULL AND length(btrim(_q)) >= 2
     AND m.body ILIKE '%' || btrim(_q) || '%'
   ORDER BY m.created_at DESC
   LIMIT LEAST(GREATEST(_limit,1), 100);
$$;
REVOKE ALL ON FUNCTION public.msg_search(text,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_search(text,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.msg_mark_read(_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_participants
     SET last_read_at = now()
   WHERE conversation_id = _conversation_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_mark_read(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_mark_read(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.msg_archive(_conversation_id uuid, _archived boolean DEFAULT true)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_participants
     SET archived_at = CASE WHEN _archived THEN now() ELSE NULL END
   WHERE conversation_id = _conversation_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_archive(uuid,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_archive(uuid,boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.msg_mute(_conversation_id uuid, _minutes int DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.conversation_participants
     SET muted_until = CASE WHEN _minutes IS NULL OR _minutes <= 0 THEN NULL
                            ELSE now() + make_interval(mins => _minutes) END
   WHERE conversation_id = _conversation_id AND user_id = auth.uid();
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_mute(uuid,int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_mute(uuid,int) TO authenticated;

CREATE OR REPLACE FUNCTION public.msg_block_user(_other_user_id uuid, _reason text DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR _other_user_id IS NULL OR auth.uid() = _other_user_id THEN RAISE EXCEPTION 'invalid'; END IF;
  INSERT INTO public.user_blocks(blocker_id, blocked_id, reason)
  VALUES (auth.uid(), _other_user_id, _reason)
  ON CONFLICT DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_block_user(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_block_user(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.msg_unblock_user(_other_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.user_blocks WHERE blocker_id = auth.uid() AND blocked_id = _other_user_id;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.msg_unblock_user(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.msg_unblock_user(uuid) TO authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Realtime — subscribe with no extra config
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='conversation_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_participants;
  END IF;
END $$;
