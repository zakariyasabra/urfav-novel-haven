-- Coin-locked chapters must not be readable by users without an unlock or VIP entitlement.
-- Split the previous free-read policies so they only expose chapters where coin_price = 0
-- AND is_vip = false. Chapters with coin_price > 0 (or is_vip = true) are now only readable
-- by users who have unlocked them, active VIPs, the owning author, or admins.

DROP POLICY IF EXISTS "Chapters anon read published free only" ON public.chapters;
DROP POLICY IF EXISTS "Chapters auth read published free only" ON public.chapters;
DROP POLICY IF EXISTS "Chapters VIP read" ON public.chapters;
DROP POLICY IF EXISTS "Chapters unlocked read" ON public.chapters;

-- Fully free chapters (no VIP flag, no coin price) — public.
CREATE POLICY "Chapters anon read free" ON public.chapters
FOR SELECT TO anon
USING (
  status = 'published'::chapter_status
  AND is_vip = false
  AND COALESCE(coin_price, 0) = 0
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.is_published = true)
);

CREATE POLICY "Chapters auth read free" ON public.chapters
FOR SELECT TO authenticated
USING (
  status = 'published'::chapter_status
  AND is_vip = false
  AND COALESCE(coin_price, 0) = 0
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.is_published = true)
);

-- VIP chapters: readable by active VIP subscribers.
CREATE POLICY "Chapters VIP read" ON public.chapters
FOR SELECT TO authenticated
USING (
  status = 'published'::chapter_status
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND is_vip = true
  AND public.is_vip(auth.uid())
  AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.is_published = true)
);

-- Paid chapters (coin_price > 0) or VIP chapters: readable by users who unlocked them.
CREATE POLICY "Chapters unlocked read" ON public.chapters
FOR SELECT TO authenticated
USING (
  status = 'published'::chapter_status
  AND (scheduled_at IS NULL OR scheduled_at <= now())
  AND (COALESCE(coin_price, 0) > 0 OR is_vip = true)
  AND EXISTS (
    SELECT 1 FROM public.chapter_unlocks cu
    WHERE cu.chapter_id = chapters.id AND cu.user_id = auth.uid()
  )
  AND EXISTS (SELECT 1 FROM public.novels n WHERE n.id = chapters.novel_id AND n.is_published = true)
);
