
-- 1) Push subscriptions
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, endpoint)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_push" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Email templates
CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject_ar TEXT NOT NULL,
  subject_en TEXT,
  body_ar TEXT NOT NULL,
  body_en TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_templates TO authenticated;
GRANT ALL ON public.email_templates TO service_role;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_email_tpl_read" ON public.email_templates FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));
CREATE POLICY "admin_email_tpl_write" ON public.email_templates FOR ALL TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_email_tpl_updated BEFORE UPDATE ON public.email_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Reader feedback
CREATE TABLE IF NOT EXISTS public.reader_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  category TEXT NOT NULL DEFAULT 'general',
  message TEXT,
  page_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.reader_feedback TO authenticated;
GRANT SELECT, INSERT ON public.reader_feedback TO anon;
GRANT ALL ON public.reader_feedback TO service_role;
ALTER TABLE public.reader_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_insert_all" ON public.reader_feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "feedback_admin_read" ON public.reader_feedback FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));

-- 4) Chapter reactions
CREATE TABLE IF NOT EXISTS public.chapter_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.chapters(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, chapter_id, emoji)
);
GRANT SELECT, INSERT, DELETE ON public.chapter_reactions TO authenticated;
GRANT SELECT ON public.chapter_reactions TO anon;
GRANT ALL ON public.chapter_reactions TO service_role;
ALTER TABLE public.chapter_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chreact_read" ON public.chapter_reactions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chreact_own" ON public.chapter_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "chreact_own_del" ON public.chapter_reactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- 5) Rate limits (window counter)
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  count INT NOT NULL DEFAULT 1,
  UNIQUE(user_id, action, window_start)
);
GRANT SELECT, INSERT, UPDATE ON public.rate_limit_counters TO authenticated;
GRANT ALL ON public.rate_limit_counters TO service_role;
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rl_own" ON public.rate_limit_counters FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.check_rate_limit(_action TEXT, _limit INT, _window_secs INT DEFAULT 60)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _c int;
BEGIN
  IF _uid IS NULL THEN RETURN false; END IF;
  DELETE FROM public.rate_limit_counters WHERE window_start < now() - make_interval(secs => _window_secs * 5);
  INSERT INTO public.rate_limit_counters(user_id, action, window_start, count)
    VALUES (_uid, _action, date_trunc('minute', now()), 1)
    ON CONFLICT (user_id, action, window_start) DO UPDATE SET count = rate_limit_counters.count + 1
    RETURNING count INTO _c;
  RETURN _c <= _limit;
END $$;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(TEXT, INT, INT) TO authenticated;

-- 6) Spam / blocked words
CREATE TABLE IF NOT EXISTS public.spam_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL UNIQUE,
  severity SMALLINT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.spam_words TO authenticated, anon;
GRANT ALL ON public.spam_words TO service_role;
ALTER TABLE public.spam_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "spam_read" ON public.spam_words FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "spam_admin" ON public.spam_words FOR ALL TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- 7) SEO overrides per path
CREATE TABLE IF NOT EXISTS public.seo_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL UNIQUE,
  title_ar TEXT,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  og_image TEXT,
  robots TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.seo_overrides TO anon, authenticated;
GRANT ALL ON public.seo_overrides TO service_role;
ALTER TABLE public.seo_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seo_read" ON public.seo_overrides FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "seo_admin" ON public.seo_overrides FOR ALL TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));
CREATE TRIGGER trg_seo_updated BEFORE UPDATE ON public.seo_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 8) Import/export jobs
CREATE TABLE IF NOT EXISTS public.io_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  entity TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  rows INT NOT NULL DEFAULT 0,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.io_jobs TO authenticated;
GRANT ALL ON public.io_jobs TO service_role;
ALTER TABLE public.io_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "io_admin" ON public.io_jobs FOR ALL TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()) AND actor_id = auth.uid());

-- 9) System error logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level TEXT NOT NULL DEFAULT 'error',
  source TEXT,
  message TEXT NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.system_logs TO authenticated;
GRANT INSERT ON public.system_logs TO anon, authenticated;
GRANT ALL ON public.system_logs TO service_role;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sys_insert" ON public.system_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "sys_read_admin" ON public.system_logs FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_system_logs_created ON public.system_logs(created_at DESC);

-- 10) System health RPC
CREATE OR REPLACE FUNCTION public.admin_system_health()
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r jsonb;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'users', (SELECT count(*) FROM public.profiles),
    'active_sessions_24h', (SELECT count(DISTINCT user_id) FROM public.reading_history WHERE last_read_at > now() - interval '24 hours'),
    'errors_24h', (SELECT count(*) FROM public.system_logs WHERE created_at > now() - interval '24 hours' AND level='error'),
    'notifications_pending', (SELECT count(*) FROM public.notifications WHERE is_read = false),
    'support_open', (SELECT count(*) FROM public.support_tickets WHERE status IN ('new','assigned','in_progress','waiting_user')),
    'server_time', now()
  ) INTO r;
  RETURN r;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_system_health() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_system_health() TO authenticated;

-- 11) Storage stats RPC (simple listing of buckets)
CREATE OR REPLACE FUNCTION public.admin_storage_stats()
RETURNS TABLE(bucket_id TEXT, files BIGINT, total_bytes BIGINT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, storage AS $$
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT o.bucket_id::text, count(*)::bigint, COALESCE(sum((o.metadata->>'size')::bigint),0)::bigint
    FROM storage.objects o GROUP BY o.bucket_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.admin_storage_stats() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_storage_stats() TO authenticated;

-- 12) Cron registry (metadata only; actual jobs use pg_cron)
CREATE TABLE IF NOT EXISTS public.cron_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  schedule TEXT NOT NULL,
  description TEXT,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  last_run_at TIMESTAMPTZ,
  last_result TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.cron_registry TO authenticated;
GRANT ALL ON public.cron_registry TO service_role;
ALTER TABLE public.cron_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cron_admin" ON public.cron_registry FOR ALL TO authenticated USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

INSERT INTO public.cron_registry(code, name, schedule, description) VALUES
  ('publish_due_chapters', 'نشر الفصول المجدولة', '*/5 * * * *', 'ينشر الفصول التي حان موعدها كل 5 دقائق'),
  ('cleanup_rate_limits', 'تنظيف عدادات معدل الطلبات', '0 * * * *', 'يمسح النوافذ القديمة')
ON CONFLICT (code) DO NOTHING;
