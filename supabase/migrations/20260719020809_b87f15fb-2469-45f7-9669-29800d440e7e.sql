-- ============================================================
-- 1) profiles: use column-level grants to hide moderation fields
-- ============================================================
REVOKE SELECT ON TABLE public.profiles FROM anon;
REVOKE SELECT ON TABLE public.profiles FROM authenticated;

-- Safe columns readable by anyone (row-filtered by existing RLS policy
-- profiles_public_active_read which restricts to active accounts).
GRANT SELECT (
  id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  bio_ar,
  bio_en,
  author_bio,
  is_verified,
  social_links,
  created_at,
  updated_at
) ON public.profiles TO anon;

-- Authenticated users additionally see non-moderation personal-preference/VIP
-- fields (still row-filtered by RLS; owners/admins see their own row via
-- profiles_owner_read_full, others only see active accounts).
GRANT SELECT (
  id,
  username,
  display_name,
  avatar_url,
  cover_url,
  bio,
  bio_ar,
  bio_en,
  author_bio,
  is_verified,
  social_links,
  is_vip,
  vip_expires_at,
  pref_language,
  pref_theme,
  allow_spoilers,
  country_code,
  created_at,
  updated_at
) ON public.profiles TO authenticated;

-- service_role keeps full table access (used by admin RPCs / SECURITY DEFINER
-- functions such as fetch_admin_users which need the moderation columns).
GRANT ALL ON public.profiles TO service_role;

-- ============================================================
-- 2) can_read_chapter: revoke anon EXECUTE
-- ============================================================
REVOKE EXECUTE ON FUNCTION public.can_read_chapter(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_read_chapter(uuid) TO authenticated;
