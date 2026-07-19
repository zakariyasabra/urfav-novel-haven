DROP POLICY IF EXISTS novel_embeddings_public_read ON public.novel_embeddings;
CREATE POLICY novel_embeddings_public_read ON public.novel_embeddings
FOR SELECT TO anon, authenticated
USING (EXISTS (SELECT 1 FROM public.novels n WHERE n.id = novel_embeddings.novel_id AND n.is_published = true));