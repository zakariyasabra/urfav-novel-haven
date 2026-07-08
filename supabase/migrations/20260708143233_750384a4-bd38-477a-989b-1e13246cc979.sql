
REVOKE SELECT ON public.comments FROM anon;
GRANT SELECT (id, novel_id, chapter_id, parent_id, content, likes_count, is_pinned, created_at) ON public.comments TO anon;

REVOKE SELECT ON public.ratings FROM anon;
GRANT SELECT (id, novel_id, score, created_at) ON public.ratings TO anon;

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (id, username, display_name, avatar_url, bio, created_at) ON public.profiles TO anon;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_any_admin_role(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_vip(uuid) FROM PUBLIC, anon;
