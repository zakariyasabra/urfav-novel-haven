
-- 1) profiles: restrict UPDATE to safe self-editable columns
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (display_name, bio, avatar_url, cover_url, social_links, author_bio, pref_language, pref_theme, bio_ar, bio_en, username, updated_at) ON public.profiles TO authenticated;

-- 2) comments: restrict UPDATE to content/is_spoiler
REVOKE UPDATE ON public.comments FROM authenticated;
GRANT UPDATE (content, is_spoiler) ON public.comments TO authenticated;

-- 3) ratings: restrict UPDATE to score/review fields
REVOKE UPDATE ON public.ratings FROM authenticated;
GRANT UPDATE (score, review_title, review_body) ON public.ratings TO authenticated;

-- 4) ad_placements: public read only for enabled + active-schedule ads
DROP POLICY IF EXISTS "public read" ON public.ad_placements;
CREATE POLICY "public read active ads" ON public.ad_placements
  FOR SELECT
  USING (
    enabled = true
    AND (starts_at IS NULL OR starts_at <= now())
    AND (ends_at IS NULL OR ends_at > now())
  );

-- Admins still have full read via existing "admin write" ALL policy.
