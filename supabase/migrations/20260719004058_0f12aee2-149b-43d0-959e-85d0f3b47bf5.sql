
-- 1. AI cached assets (per novel, per kind, optionally scoped to a max chapter index)
CREATE TABLE public.ai_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('summary_spoilerfree','summary_progress','characters','timeline','world','glossary','reading_order')),
  scope_key TEXT NOT NULL DEFAULT 'all',  -- 'all' for spoiler-free; max chapter index for progress-scoped
  lang TEXT NOT NULL DEFAULT 'ar' CHECK (lang IN ('ar','en')),
  content JSONB NOT NULL,
  provider TEXT,
  model TEXT,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (novel_id, kind, scope_key, lang)
);
CREATE INDEX ai_assets_novel_kind_idx ON public.ai_assets (novel_id, kind);
GRANT SELECT ON public.ai_assets TO anon, authenticated;
GRANT ALL ON public.ai_assets TO service_role;
ALTER TABLE public.ai_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_assets read for readable novels" ON public.ai_assets FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_id AND n.is_published = true));
CREATE POLICY "ai_assets admin write" ON public.ai_assets FOR ALL
  USING (public.has_any_admin_role(auth.uid())) WITH CHECK (public.has_any_admin_role(auth.uid()));

-- 2. AI conversations
CREATE TABLE public.ai_conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id UUID NOT NULL REFERENCES public.novels(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  allow_spoilers BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_conversations_user_novel_idx ON public.ai_conversations (user_id, novel_id, updated_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT ALL ON public.ai_conversations TO service_role;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conv own" ON public.ai_conversations FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. AI messages
CREATE TABLE public.ai_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant','system')),
  content TEXT NOT NULL,
  max_chapter_index INT,   -- reader progress snapshot at message time
  allow_spoilers BOOLEAN,
  tokens_in INT,
  tokens_out INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_messages_conv_idx ON public.ai_messages (conversation_id, created_at);
GRANT SELECT, INSERT, DELETE ON public.ai_messages TO authenticated;
GRANT ALL ON public.ai_messages TO service_role;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_msg own via conv" ON public.ai_messages FOR ALL
  USING (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));

-- 4. AI generation logs (admin observability)
CREATE TABLE public.ai_generation_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  novel_id UUID REFERENCES public.novels(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  provider TEXT,
  model TEXT,
  tokens_in INT,
  tokens_out INT,
  duration_ms INT,
  status TEXT NOT NULL DEFAULT 'ok',
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_logs_created_idx ON public.ai_generation_logs (created_at DESC);
GRANT SELECT ON public.ai_generation_logs TO authenticated;
GRANT ALL ON public.ai_generation_logs TO service_role;
ALTER TABLE public.ai_generation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_logs admin read" ON public.ai_generation_logs FOR SELECT
  USING (public.has_any_admin_role(auth.uid()));

-- Trigger to touch updated_at
CREATE OR REPLACE FUNCTION public._ai_touch_updated() RETURNS TRIGGER
  LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER ai_assets_touch BEFORE UPDATE ON public.ai_assets FOR EACH ROW EXECUTE FUNCTION public._ai_touch_updated();
CREATE TRIGGER ai_conv_touch BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public._ai_touch_updated();

-- 5. RPCs

-- Spoiler-aware asset lookup: returns the best asset for the caller's progress.
CREATE OR REPLACE FUNCTION public.ai_get_asset(_novel_id UUID, _kind TEXT, _lang TEXT DEFAULT 'ar')
RETURNS TABLE (id UUID, content JSONB, scope_key TEXT, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ctx RECORD; want_scope TEXT;
BEGIN
  IF _kind = 'summary_spoilerfree' OR _kind = 'reading_order' THEN
    RETURN QUERY SELECT a.id, a.content, a.scope_key, a.updated_at
      FROM public.ai_assets a
      WHERE a.novel_id = _novel_id AND a.kind = _kind AND a.lang = _lang AND a.scope_key = 'all' LIMIT 1;
    RETURN;
  END IF;
  SELECT * INTO ctx FROM public.ai_reader_context(_novel_id);
  IF ctx.allow_spoilers THEN
    RETURN QUERY SELECT a.id, a.content, a.scope_key, a.updated_at
      FROM public.ai_assets a
      WHERE a.novel_id = _novel_id AND a.kind = _kind AND a.lang = _lang
      ORDER BY (a.scope_key = 'all') DESC, a.updated_at DESC LIMIT 1;
    RETURN;
  END IF;
  want_scope := COALESCE(ctx.last_chapter_index, 0)::text;
  RETURN QUERY SELECT a.id, a.content, a.scope_key, a.updated_at
    FROM public.ai_assets a
    WHERE a.novel_id = _novel_id AND a.kind = _kind AND a.lang = _lang
      AND a.scope_key <> 'all'
      AND (a.scope_key ~ '^[0-9]+$')
      AND a.scope_key::int <= GREATEST(0, want_scope::int)
    ORDER BY a.scope_key::int DESC LIMIT 1;
END $$;
REVOKE EXECUTE ON FUNCTION public.ai_get_asset(UUID,TEXT,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_get_asset(UUID,TEXT,TEXT) TO authenticated;

-- List my conversations for a novel
CREATE OR REPLACE FUNCTION public.ai_assistant_conversations(_novel_id UUID)
RETURNS TABLE (id UUID, title TEXT, is_pinned BOOLEAN, allow_spoilers BOOLEAN, updated_at TIMESTAMPTZ, message_count BIGINT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.is_pinned, c.allow_spoilers, c.updated_at,
    (SELECT count(*) FROM public.ai_messages m WHERE m.conversation_id = c.id)
  FROM public.ai_conversations c
  WHERE c.user_id = auth.uid() AND c.novel_id = _novel_id
  ORDER BY c.is_pinned DESC, c.updated_at DESC
$$;
REVOKE EXECUTE ON FUNCTION public.ai_assistant_conversations(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_assistant_conversations(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_assistant_create_conversation(_novel_id UUID, _title TEXT, _allow_spoilers BOOLEAN)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE nid UUID;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  INSERT INTO public.ai_conversations(user_id, novel_id, title, allow_spoilers)
    VALUES (auth.uid(), _novel_id, COALESCE(NULLIF(trim(_title),''),'محادثة جديدة'), COALESCE(_allow_spoilers, false))
    RETURNING id INTO nid;
  RETURN nid;
END $$;
REVOKE EXECUTE ON FUNCTION public.ai_assistant_create_conversation(UUID,TEXT,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_assistant_create_conversation(UUID,TEXT,BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_assistant_rename_conversation(_id UUID, _title TEXT)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ai_conversations SET title = COALESCE(NULLIF(trim(_title),''), title), updated_at = now()
  WHERE id = _id AND user_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.ai_assistant_rename_conversation(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_assistant_rename_conversation(UUID,TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_assistant_pin_conversation(_id UUID, _pinned BOOLEAN)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.ai_conversations SET is_pinned = COALESCE(_pinned,false), updated_at = now()
  WHERE id = _id AND user_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.ai_assistant_pin_conversation(UUID,BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_assistant_pin_conversation(UUID,BOOLEAN) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_assistant_delete_conversation(_id UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  DELETE FROM public.ai_conversations WHERE id = _id AND user_id = auth.uid()
$$;
REVOKE EXECUTE ON FUNCTION public.ai_assistant_delete_conversation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_assistant_delete_conversation(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_assistant_messages(_conversation_id UUID)
RETURNS TABLE (id UUID, role TEXT, content TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.role, m.content, m.created_at
  FROM public.ai_messages m
  WHERE m.conversation_id = _conversation_id
    AND EXISTS (SELECT 1 FROM public.ai_conversations c WHERE c.id = m.conversation_id AND c.user_id = auth.uid())
  ORDER BY m.created_at ASC
$$;
REVOKE EXECUTE ON FUNCTION public.ai_assistant_messages(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_assistant_messages(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.ai_admin_delete_asset(_novel_id UUID, _kind TEXT DEFAULT NULL)
RETURNS INT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cnt INT;
BEGIN
  IF NOT public.has_any_admin_role(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM public.ai_assets WHERE novel_id = _novel_id AND (_kind IS NULL OR kind = _kind);
  GET DIAGNOSTICS cnt = ROW_COUNT;
  RETURN cnt;
END $$;
REVOKE EXECUTE ON FUNCTION public.ai_admin_delete_asset(UUID,TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_admin_delete_asset(UUID,TEXT) TO authenticated;
