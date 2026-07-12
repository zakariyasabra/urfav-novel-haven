CREATE INDEX IF NOT EXISTS idx_reading_history_user_last_read
  ON public.reading_history (user_id, last_read_at DESC);

CREATE INDEX IF NOT EXISTS idx_chapters_novel_number
  ON public.chapters (novel_id, chapter_number);

CREATE INDEX IF NOT EXISTS idx_chapters_status_published
  ON public.chapters (status, published_at DESC) WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_novels_views_desc
  ON public.novels (views_count DESC) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_novels_created_desc
  ON public.novels (created_at DESC) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_novels_rating_desc
  ON public.novels (rating_avg DESC, rating_count DESC) WHERE is_published = true;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_favorites_user
  ON public.favorites (user_id);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_created
  ON public.bookmarks (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comments_novel_created
  ON public.comments (novel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_coin_purchase_requests_status
  ON public.coin_purchase_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status
  ON public.withdrawal_requests (status, created_at DESC);