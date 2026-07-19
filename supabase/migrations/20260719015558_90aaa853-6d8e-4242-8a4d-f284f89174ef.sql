
-- H-1: Restrict user_equipment (drop anon public read)
DROP POLICY IF EXISTS eq_public_read ON public.user_equipment;
REVOKE SELECT ON public.user_equipment FROM anon;

-- H-2: Restrict user_xp to own row only
DROP POLICY IF EXISTS "user_xp authenticated read" ON public.user_xp;
CREATE POLICY "user_xp own read" ON public.user_xp FOR SELECT TO authenticated USING (auth.uid() = user_id);
REVOKE SELECT ON public.user_xp FROM anon;

-- M-1: Convert recommendation SECURITY DEFINER functions (read-only over public data) to SECURITY INVOKER
ALTER FUNCTION public.rec_hidden_gems(integer) SECURITY INVOKER;
ALTER FUNCTION public.rec_more_like_this(uuid, integer) SECURITY INVOKER;
ALTER FUNCTION public.rec_popular_week(integer) SECURITY INVOKER;
ALTER FUNCTION public.rec_recently_updated(integer) SECURITY INVOKER;
ALTER FUNCTION public.rec_trending_today(integer) SECURITY INVOKER;
