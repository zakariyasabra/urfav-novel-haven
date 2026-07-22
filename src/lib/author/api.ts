/**
 * Unified Author API layer.
 *
 * Centralizes every read/write path used by the Author system:
 *  - Public profile page (`/authors/$username`)
 *  - Author Studio dashboard (`/author`)
 *  - Novel management (`/author/novels/$id`)
 *
 * Existing helpers in `@/lib/reader-api` and `@/lib/author-api` remain the
 * concrete implementations; this module re-exports them under one namespace
 * and adds aggregate helpers (chapter counts, ratings, comments, totals)
 * that were previously computed ad-hoc in components.
 */

import { supabase } from "@/integrations/supabase/client";

export {
  fetchAuthorByUsername,
  fetchAuthorNovels,
  fetchAuthorFollowerCount,
  isFollowingAuthor,
  toggleFollowAuthor,
  type AuthorProfileData,
} from "@/lib/reader-api";

export { fetchMyAuthorNovels } from "@/lib/author-api";

/** Aggregate stats for the public author page. */
export interface AuthorStats {
  novelsPublished: number;
  novelsTotal: number;
  chaptersPublished: number;
  totalViews: number;
  totalRatings: number;
  totalComments: number;
  followers: number;
  avgRating: number;
}

/**
 * Load aggregate stats for an author across all their novels in one round.
 * Uses `head+count` requests so we don't ship row payloads for stats.
 */
export async function fetchAuthorStats(authorId: string): Promise<AuthorStats> {
  const { data: novels } = await supabase
    .from("novels")
    .select("id,views_count,rating_avg,rating_count,is_published,is_upcoming")
    .eq("owner_id", authorId);

  const list = (novels ?? []) as Array<{
    id: string;
    views_count: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    is_published: boolean;
    is_upcoming: boolean | null;
  }>;

  const publishedNovels = list.filter((n) => n.is_published && !n.is_upcoming);
  const novelIds = list.map((n) => n.id);

  const [chaptersRes, commentsRes, followersRes] = await Promise.all([
    novelIds.length
      ? supabase
          .from("chapters")
          .select("id", { count: "exact", head: true })
          .in("novel_id", novelIds)
          .eq("status", "published")
      : Promise.resolve({ count: 0 } as { count: number | null }),
    novelIds.length
      ? supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .in("novel_id", novelIds)
      : Promise.resolve({ count: 0 } as { count: number | null }),
    supabase
      .from("author_follows")
      .select("author_id", { count: "exact", head: true })
      .eq("author_id", authorId),
  ]);

  const totalViews = publishedNovels.reduce((s, n) => s + (n.views_count ?? 0), 0);
  const totalRatings = publishedNovels.reduce((s, n) => s + (n.rating_count ?? 0), 0);
  const weighted = publishedNovels.reduce(
    (s, n) => s + (n.rating_avg ?? 0) * (n.rating_count ?? 0),
    0,
  );
  const avgRating = totalRatings > 0 ? weighted / totalRatings : 0;

  return {
    novelsPublished: publishedNovels.length,
    novelsTotal: list.length,
    chaptersPublished: chaptersRes.count ?? 0,
    totalViews,
    totalRatings,
    totalComments: commentsRes.count ?? 0,
    followers: followersRes.count ?? 0,
    avgRating,
  };
}

export function formatCompact(n: number, locale = "ar-EG"): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  return n.toLocaleString(locale);
}

/**
 * Batch-fetch published chapter counts for a set of novel ids.
 * Returns a map keyed by novel id.
 */
export async function fetchNovelChapterCounts(
  novelIds: string[],
): Promise<Record<string, number>> {
  if (!novelIds.length) return {};
  const { data, error } = await supabase
    .from("chapters")
    .select("novel_id")
    .in("novel_id", novelIds)
    .eq("status", "published");
  if (error) return {};
  const map: Record<string, number> = {};
  for (const row of data ?? []) {
    const id = (row as { novel_id: string }).novel_id;
    map[id] = (map[id] ?? 0) + 1;
  }
  return map;
}
