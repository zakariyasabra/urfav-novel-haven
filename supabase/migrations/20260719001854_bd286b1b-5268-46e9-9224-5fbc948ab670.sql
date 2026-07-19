
-- Fix 1: Restrict leaderboard_snapshots + user_xp reads to authenticated users only
DROP POLICY IF EXISTS "lbs public read" ON public.leaderboard_snapshots;
CREATE POLICY "lbs authenticated read" ON public.leaderboard_snapshots
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "user_xp public read" ON public.user_xp;
CREATE POLICY "user_xp authenticated read" ON public.user_xp
  FOR SELECT TO authenticated USING (true);

REVOKE SELECT ON public.leaderboard_snapshots FROM anon;
REVOKE SELECT ON public.user_xp FROM anon;

-- Fix 2: Restrict referral_codes reads to the owner. Lookup by code value goes through
-- the existing SECURITY DEFINER function gm_use_referral, which bypasses RLS.
DROP POLICY IF EXISTS "rc public read" ON public.referral_codes;
CREATE POLICY "rc owner read" ON public.referral_codes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Fix 3: Revoke public EXECUTE from SECURITY DEFINER trigger/helper functions. These are
-- fired by triggers as the table owner, so anon/authenticated should never call them directly.
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    '_gm_notify_challenge_complete()',
    '_gm_notify_challenge_completed()',
    '_gm_notify_mission_complete()',
    '_gm_notify_mission_completed()',
    '_gm_on_bookmark()',
    '_gm_on_chapter_published()',
    '_gm_on_comment()',
    '_gm_on_comment_like()',
    '_gm_on_favorite()',
    '_gm_on_follow()',
    '_gm_on_novel_published()',
    '_gm_on_rating()'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;

-- Fix 4: Set immutable search_path on the two functions flagged by the linter.
ALTER FUNCTION public.gm_level_from_xp(integer) SET search_path = public;
ALTER FUNCTION public.mk_touch_updated() SET search_path = public;
