
-- Reading Clubs: communities around novels or topics
CREATE TABLE public.reading_clubs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  cover_url text,
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  novel_id uuid REFERENCES public.novels(id) ON DELETE SET NULL,
  is_private boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  member_count integer NOT NULL DEFAULT 1,
  post_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_clubs TO authenticated;
GRANT SELECT ON public.reading_clubs TO anon;
GRANT ALL ON public.reading_clubs TO service_role;
ALTER TABLE public.reading_clubs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clubs_public_read" ON public.reading_clubs FOR SELECT
  USING (NOT is_private AND NOT is_archived);
CREATE POLICY "clubs_owner_all" ON public.reading_clubs FOR ALL
  USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE INDEX idx_reading_clubs_novel ON public.reading_clubs(novel_id);
CREATE INDEX idx_reading_clubs_owner ON public.reading_clubs(owner_id);

CREATE TABLE public.reading_club_members (
  club_id uuid NOT NULL REFERENCES public.reading_clubs(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','moderator','member')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (club_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_club_members TO authenticated;
GRANT ALL ON public.reading_club_members TO service_role;
ALTER TABLE public.reading_club_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_members_self_read" ON public.reading_club_members FOR SELECT
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.reading_club_members m
    WHERE m.club_id = reading_club_members.club_id AND m.user_id = auth.uid()
  ));

CREATE INDEX idx_club_members_user ON public.reading_club_members(user_id);

-- Private clubs: only members can read
CREATE POLICY "clubs_member_read" ON public.reading_clubs FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.reading_club_members m
    WHERE m.club_id = reading_clubs.id AND m.user_id = auth.uid()
  ));

-- Posts
CREATE TABLE public.reading_club_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id uuid NOT NULL REFERENCES public.reading_clubs(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  novel_id uuid REFERENCES public.novels(id) ON DELETE SET NULL,
  chapter_id uuid REFERENCES public.chapters(id) ON DELETE SET NULL,
  is_pinned boolean NOT NULL DEFAULT false,
  is_deleted boolean NOT NULL DEFAULT false,
  reply_count integer NOT NULL DEFAULT 0,
  like_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_club_posts TO authenticated;
GRANT ALL ON public.reading_club_posts TO service_role;
ALTER TABLE public.reading_club_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_posts_member_read" ON public.reading_club_posts FOR SELECT
  USING (NOT is_deleted AND EXISTS (
    SELECT 1 FROM public.reading_club_members m
    WHERE m.club_id = reading_club_posts.club_id AND m.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.reading_clubs c
    WHERE c.id = reading_club_posts.club_id AND NOT c.is_private AND NOT is_deleted
  ));
CREATE POLICY "club_posts_author_manage" ON public.reading_club_posts FOR ALL
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE INDEX idx_club_posts_club ON public.reading_club_posts(club_id, created_at DESC);

CREATE TABLE public.reading_club_post_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.reading_club_posts(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reading_club_post_replies TO authenticated;
GRANT ALL ON public.reading_club_post_replies TO service_role;
ALTER TABLE public.reading_club_post_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_replies_visible" ON public.reading_club_post_replies FOR SELECT
  USING (NOT is_deleted AND EXISTS (
    SELECT 1 FROM public.reading_club_posts p
    JOIN public.reading_clubs c ON c.id = p.club_id
    WHERE p.id = reading_club_post_replies.post_id
      AND (NOT c.is_private OR EXISTS (
        SELECT 1 FROM public.reading_club_members m
        WHERE m.club_id = c.id AND m.user_id = auth.uid()
      ))
  ));
CREATE POLICY "club_replies_author_manage" ON public.reading_club_post_replies FOR ALL
  USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());

CREATE INDEX idx_club_replies_post ON public.reading_club_post_replies(post_id, created_at);

-- Updated_at trigger
CREATE TRIGGER trg_reading_clubs_updated BEFORE UPDATE ON public.reading_clubs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_club_posts_updated BEFORE UPDATE ON public.reading_club_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RPC: create club (auto-adds owner as member)
CREATE OR REPLACE FUNCTION public.club_create(
  p_slug text, p_name_ar text, p_name_en text DEFAULT NULL,
  p_description_ar text DEFAULT NULL, p_description_en text DEFAULT NULL,
  p_novel_id uuid DEFAULT NULL, p_is_private boolean DEFAULT false,
  p_cover_url text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  INSERT INTO public.reading_clubs(slug, name_ar, name_en, description_ar, description_en, novel_id, is_private, cover_url, owner_id)
    VALUES (p_slug, p_name_ar, p_name_en, p_description_ar, p_description_en, p_novel_id, p_is_private, p_cover_url, v_uid)
    RETURNING id INTO v_id;
  INSERT INTO public.reading_club_members(club_id, user_id, role) VALUES (v_id, v_uid, 'owner');
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.club_create(text,text,text,text,text,uuid,boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_create(text,text,text,text,text,uuid,boolean,text) TO authenticated;

-- RPC: join
CREATE OR REPLACE FUNCTION public.club_join(p_club_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_private boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT is_private INTO v_private FROM public.reading_clubs WHERE id = p_club_id AND NOT is_archived;
  IF v_private IS NULL THEN RAISE EXCEPTION 'club_not_found'; END IF;
  IF v_private THEN RAISE EXCEPTION 'club_is_private'; END IF;
  INSERT INTO public.reading_club_members(club_id, user_id, role) VALUES (p_club_id, v_uid, 'member')
    ON CONFLICT DO NOTHING;
  UPDATE public.reading_clubs SET member_count = (SELECT count(*) FROM public.reading_club_members WHERE club_id = p_club_id)
    WHERE id = p_club_id;
END $$;
REVOKE ALL ON FUNCTION public.club_join(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_join(uuid) TO authenticated;

-- RPC: leave
CREATE OR REPLACE FUNCTION public.club_leave(p_club_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF EXISTS (SELECT 1 FROM public.reading_clubs WHERE id = p_club_id AND owner_id = v_uid) THEN
    RAISE EXCEPTION 'owner_cannot_leave';
  END IF;
  DELETE FROM public.reading_club_members WHERE club_id = p_club_id AND user_id = v_uid;
  UPDATE public.reading_clubs SET member_count = (SELECT count(*) FROM public.reading_club_members WHERE club_id = p_club_id)
    WHERE id = p_club_id;
END $$;
REVOKE ALL ON FUNCTION public.club_leave(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_leave(uuid) TO authenticated;

-- RPC: post create
CREATE OR REPLACE FUNCTION public.club_post_create(
  p_club_id uuid, p_content text, p_title text DEFAULT NULL,
  p_novel_id uuid DEFAULT NULL, p_chapter_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reading_club_members WHERE club_id = p_club_id AND user_id = v_uid) THEN
    RAISE EXCEPTION 'not_member';
  END IF;
  IF length(coalesce(p_content,'')) < 2 THEN RAISE EXCEPTION 'content_too_short'; END IF;
  INSERT INTO public.reading_club_posts(club_id, author_id, title, content, novel_id, chapter_id)
    VALUES (p_club_id, v_uid, p_title, p_content, p_novel_id, p_chapter_id)
    RETURNING id INTO v_id;
  UPDATE public.reading_clubs SET post_count = post_count + 1 WHERE id = p_club_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.club_post_create(uuid,text,text,uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_post_create(uuid,text,text,uuid,uuid) TO authenticated;

-- RPC: reply
CREATE OR REPLACE FUNCTION public.club_reply_create(p_post_id uuid, p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_id uuid; v_club uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF length(coalesce(p_content,'')) < 1 THEN RAISE EXCEPTION 'content_too_short'; END IF;
  SELECT club_id INTO v_club FROM public.reading_club_posts WHERE id = p_post_id AND NOT is_deleted;
  IF v_club IS NULL THEN RAISE EXCEPTION 'post_not_found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.reading_club_members WHERE club_id = v_club AND user_id = v_uid) THEN
    RAISE EXCEPTION 'not_member';
  END IF;
  INSERT INTO public.reading_club_post_replies(post_id, author_id, content)
    VALUES (p_post_id, v_uid, p_content) RETURNING id INTO v_id;
  UPDATE public.reading_club_posts SET reply_count = reply_count + 1 WHERE id = p_post_id;
  RETURN v_id;
END $$;
REVOKE ALL ON FUNCTION public.club_reply_create(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.club_reply_create(uuid,text) TO authenticated;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_club_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.reading_club_post_replies;
