import { supabase } from "@/integrations/supabase/client";

export interface NovelAnalytics {
  views_total: number;
  chapters_total: number;
  chapters_published: number;
  chapter_views: number;
  unique_readers: number;
  favorites: number;
  comments: number;
  rating_avg: number;
  rating_count: number;
  unlocks: number;
  coins_earned: number;
  gifts_received: number;
  gift_coins: number;
}

export interface AuthorAnalytics {
  novels_total: number;
  novels_published: number;
  chapters_total: number;
  chapters_published: number;
  views_total: number;
  followers: number;
  favorites: number;
  unique_readers: number;
  vip_readers: number;
  coins_total: number;
  coins_pending: number;
  coins_paid_out: number;
  gifts_received: number;
  gift_coins: number;
}

export async function fetchNovelAnalytics(novelId: string): Promise<NovelAnalytics> {
  const { data, error } = await supabase.rpc("admin_novel_analytics", { _novel_id: novelId });
  if (error) throw error;
  return data as unknown as NovelAnalytics;
}

export async function fetchAuthorAnalytics(authorId: string): Promise<AuthorAnalytics> {
  const { data, error } = await supabase.rpc("admin_author_analytics", { _author_id: authorId });
  if (error) throw error;
  return data as unknown as AuthorAnalytics;
}
