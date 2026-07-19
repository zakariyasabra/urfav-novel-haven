
-- Enable pgvector (kept in the `extensions` schema per Supabase convention)
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ── Novel embeddings ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.novel_embeddings (
  novel_id    uuid PRIMARY KEY REFERENCES public.novels(id) ON DELETE CASCADE,
  embedding   extensions.vector(768),
  model       text NOT NULL DEFAULT 'text-embedding-004',
  source      text NOT NULL DEFAULT 'title_synopsis',
  content_hash text,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.novel_embeddings TO anon, authenticated;
GRANT ALL    ON public.novel_embeddings TO service_role;
ALTER TABLE  public.novel_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "novel_embeddings_public_read" ON public.novel_embeddings FOR SELECT USING (true);
CREATE POLICY "novel_embeddings_admin_write" ON public.novel_embeddings FOR ALL
  USING (public.has_any_admin_role(auth.uid()))
  WITH CHECK (public.has_any_admin_role(auth.uid()));

-- IVFFlat cosine index (dormant until rows exist; safe to create empty).
CREATE INDEX IF NOT EXISTS idx_novel_embeddings_cosine
  ON public.novel_embeddings
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- ── User taste embeddings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_taste_embeddings (
  user_id     uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  embedding   extensions.vector(768),
  model       text NOT NULL DEFAULT 'text-embedding-004',
  source      text NOT NULL DEFAULT 'reading_history',
  sample_size int NOT NULL DEFAULT 0,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_taste_embeddings TO authenticated;
GRANT ALL    ON public.user_taste_embeddings TO service_role;
ALTER TABLE  public.user_taste_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_taste_read_self" ON public.user_taste_embeddings FOR SELECT
  USING (user_id = auth.uid() OR public.has_any_admin_role(auth.uid()));

CREATE INDEX IF NOT EXISTS idx_user_taste_cosine
  ON public.user_taste_embeddings
  USING ivfflat (embedding extensions.vector_cosine_ops)
  WITH (lists = 100);

-- Small trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION public._touch_embedding_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_novel_embeddings_touch ON public.novel_embeddings;
CREATE TRIGGER trg_novel_embeddings_touch BEFORE UPDATE ON public.novel_embeddings
  FOR EACH ROW EXECUTE FUNCTION public._touch_embedding_updated_at();

DROP TRIGGER IF EXISTS trg_user_taste_touch ON public.user_taste_embeddings;
CREATE TRIGGER trg_user_taste_touch BEFORE UPDATE ON public.user_taste_embeddings
  FOR EACH ROW EXECUTE FUNCTION public._touch_embedding_updated_at();
