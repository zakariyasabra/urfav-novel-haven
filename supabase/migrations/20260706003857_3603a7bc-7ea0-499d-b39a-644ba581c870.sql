
CREATE OR REPLACE FUNCTION public.has_any_admin_role(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=_user_id AND role IN ('admin','moderator','editor'))
$$;

ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_pinned boolean NOT NULL DEFAULT false;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS likes_count int NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id uuid NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.comment_likes TO authenticated;
GRANT SELECT ON public.comment_likes TO anon;
GRANT ALL ON public.comment_likes TO service_role;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "like own" ON public.comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid()=user_id);
CREATE POLICY "unlike own" ON public.comment_likes FOR DELETE TO authenticated USING (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('comment','dmca','contact','abuse','bug')),
  reporter_id uuid, reporter_email text, reporter_name text,
  subject text, content text NOT NULL,
  target_url text, target_id uuid,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','resolved','dismissed')),
  admin_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;
GRANT INSERT ON public.reports TO anon;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can submit" ON public.reports FOR INSERT WITH CHECK (true);
CREATE POLICY "admins read" ON public.reports FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));
CREATE POLICY "admins update" ON public.reports FOR UPDATE TO authenticated USING (public.has_any_admin_role(auth.uid()));
CREATE POLICY "admins delete" ON public.reports FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.vip_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name_ar text NOT NULL, name_en text, description_ar text,
  price_cents int NOT NULL, currency text NOT NULL DEFAULT 'USD',
  duration_days int NOT NULL,
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_plans TO anon, authenticated;
GRANT ALL ON public.vip_plans TO service_role;
ALTER TABLE public.vip_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read active" ON public.vip_plans FOR SELECT USING (is_active=true OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "admin write" ON public.vip_plans FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.vip_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.vip_plans(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','cancelled','expired')),
  started_at timestamptz, expires_at timestamptz,
  provider text, provider_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_subscriptions TO authenticated;
GRANT ALL ON public.vip_subscriptions TO service_role;
ALTER TABLE public.vip_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.vip_subscriptions FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_any_admin_role(auth.uid()));
CREATE POLICY "admin manage" ON public.vip_subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.is_vip(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.vip_subscriptions WHERE user_id=_user_id AND status='active' AND (expires_at IS NULL OR expires_at>now()))
$$;

CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  subscription_id uuid REFERENCES public.vip_subscriptions(id) ON DELETE SET NULL,
  amount_cents int NOT NULL, currency text NOT NULL DEFAULT 'USD',
  provider text NOT NULL, provider_ref text,
  status text NOT NULL DEFAULT 'pending', raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.payment_transactions FOR SELECT TO authenticated USING (auth.uid()=user_id OR public.has_any_admin_role(auth.uid()));

CREATE TABLE IF NOT EXISTS public.ad_placements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot text UNIQUE NOT NULL, label_ar text NOT NULL,
  enabled boolean NOT NULL DEFAULT false, script_html text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.ad_placements TO anon, authenticated;
GRANT ALL ON public.ad_placements TO service_role;
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.ad_placements FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.ad_placements FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.ad_placements (slot,label_ar) VALUES
 ('header','رأس الصفحة'),('home_top','الرئيسية - أعلى'),('home_mid','الرئيسية - وسط'),
 ('list','صفحات القوائم'),('chapter_top','الفصل - أعلى'),('chapter_bottom','الفصل - أسفل'),
 ('sidebar','الشريط الجانبي'),('footer','التذييل')
ON CONFLICT (slot) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.site_settings (
  key text PRIMARY KEY, value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO service_role;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "admin write" ON public.site_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.site_settings (key,value) VALUES
 ('maintenance','{"enabled":false,"message":"الموقع تحت الصيانة"}'::jsonb),
 ('social','{"twitter":"","facebook":"","instagram":"","telegram":"","discord":""}'::jsonb),
 ('metadata','{"site_name":"UR Fav Novel","tagline":"منصة قراءة الروايات المترجمة","description":"اقرأ آلاف الروايات المترجمة مجاناً"}'::jsonb),
 ('smtp','{"from_name":"UR Fav Novel","from_email":"","reply_to":""}'::jsonb),
 ('features','{"comments_enabled":true,"registration_enabled":true,"vip_enabled":true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id bigserial PRIMARY KEY,
  actor_id uuid, action text NOT NULL,
  target_type text, target_id text,
  meta jsonb, ip text, user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_any_admin_role(auth.uid()));
CREATE POLICY "insert own" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (actor_id=auth.uid() OR actor_id IS NULL);

CREATE TABLE IF NOT EXISTS public.search_history (
  id bigserial PRIMARY KEY,
  user_id uuid, query text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT INSERT ON public.search_history TO anon;
GRANT ALL ON public.search_history TO service_role;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.search_history FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "own insert" ON public.search_history FOR INSERT WITH CHECK (auth.uid()=user_id OR user_id IS NULL);
CREATE POLICY "own delete" ON public.search_history FOR DELETE TO authenticated USING (auth.uid()=user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_query ON public.search_history (query);

CREATE TABLE IF NOT EXISTS public.reading_stats (
  user_id uuid PRIMARY KEY,
  current_streak int NOT NULL DEFAULT 0,
  longest_streak int NOT NULL DEFAULT 0,
  last_read_date date,
  total_chapters_read int NOT NULL DEFAULT 0,
  total_minutes int NOT NULL DEFAULT 0,
  achievements jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.reading_stats TO authenticated;
GRANT ALL ON public.reading_stats TO service_role;
ALTER TABLE public.reading_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own read" ON public.reading_stats FOR SELECT TO authenticated USING (auth.uid()=user_id);
CREATE POLICY "own write" ON public.reading_stats FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_novels_title_trgm ON public.novels USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_novels_author_trgm ON public.novels USING gin (author gin_trgm_ops);

CREATE OR REPLACE FUNCTION public.recompute_comment_likes()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE cid uuid;
BEGIN
  cid := COALESCE(NEW.comment_id, OLD.comment_id);
  UPDATE public.comments SET likes_count = (SELECT COUNT(*) FROM public.comment_likes WHERE comment_id=cid) WHERE id=cid;
  RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS trg_comment_likes_recount ON public.comment_likes;
CREATE TRIGGER trg_comment_likes_recount AFTER INSERT OR DELETE ON public.comment_likes FOR EACH ROW EXECUTE FUNCTION public.recompute_comment_likes();

INSERT INTO public.vip_plans (code,name_ar,name_en,description_ar,price_cents,duration_days,features,sort_order) VALUES
 ('monthly','VIP شهري','Monthly VIP','بدون إعلانات + فصول مبكرة',499,30,'["ad_free","early_access","vip_badge"]'::jsonb,1),
 ('quarterly','VIP ربع سنوي','3 Months VIP','خصم 15% + كل مزايا الشهري',1299,90,'["ad_free","early_access","vip_badge","discount"]'::jsonb,2),
 ('biannual','VIP نصف سنوي','6 Months VIP','خصم 25% + محتوى حصري',2299,180,'["ad_free","early_access","vip_badge","exclusive_content"]'::jsonb,3),
 ('yearly','VIP سنوي','Yearly VIP','أفضل قيمة + كل المزايا',3999,365,'["ad_free","early_access","vip_badge","exclusive_content","priority_support"]'::jsonb,4)
ON CONFLICT (code) DO NOTHING;
