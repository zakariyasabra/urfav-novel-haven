-- Restore base table grants that were lost. RLS still enforces row visibility.
-- Column-level grants keep moderation-only fields hidden even if RLS allowed the row.
GRANT SELECT (
  id, username, display_name, avatar_url, bio, is_vip, vip_expires_at,
  created_at, updated_at, social_links, author_bio, cover_url, is_verified,
  pref_language, pref_theme, bio_ar, bio_en, account_status
) ON public.profiles TO anon, authenticated;

-- Authenticated users additionally need suspended_until/status_reason visibility on their OWN row
-- (RLS still restricts to auth.uid() = id or admins). Granting at column level is fine.
GRANT SELECT (status_reason, suspended_until) ON public.profiles TO authenticated;

GRANT INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;