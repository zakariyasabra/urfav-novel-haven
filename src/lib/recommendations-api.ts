import { supabase } from "@/integrations/supabase/client";
import { fetchNovelsByIds } from "@/lib/api";
import type { NovelCardData } from "@/components/novel-card";

export type RecReasonParams = Record<string, unknown>;

export interface RecItem {
  novel_id: string;
  score: number;
  reason_key: string;
  reason_params: RecReasonParams | null;
}

export interface RecNovel extends NovelCardData {
  id: string;
  reason_key: string;
  reason_params: RecReasonParams | null;
  score: number;
}

export type RecSection =
  | "for_you"
  | "because_you_read"
  | "trending_today"
  | "popular_week"
  | "hidden_gems"
  | "recently_updated"
  | "from_followed_authors"
  | "readers_like_you";

const RPC_MAP: Record<RecSection, string> = {
  for_you: "rec_for_you",
  because_you_read: "rec_because_you_read",
  trending_today: "rec_trending_today",
  popular_week: "rec_popular_week",
  hidden_gems: "rec_hidden_gems",
  recently_updated: "rec_recently_updated",
  from_followed_authors: "rec_from_followed_authors",
  readers_like_you: "rec_readers_like_you",
};

async function callRec(rpc: string, args: Record<string, unknown>): Promise<RecItem[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc(rpc, args);
  if (error) {
    // Missing session / permissions → treat as empty for graceful home rendering
    console.warn(`[rec] ${rpc}`, error.message);
    return [];
  }
  return (data ?? []) as RecItem[];
}

/** Hydrate rec items into full novel cards, preserving order + reason. */
export async function fetchRecommendationSection(
  section: RecSection,
  limit = 12,
): Promise<RecNovel[]> {
  const items = await callRec(RPC_MAP[section], { p_limit: limit });
  if (items.length === 0) return [];
  const novels = await fetchNovelsByIds(items.map((i) => i.novel_id));
  const byId = new Map(novels.map((n) => [n.id, n]));
  const out: RecNovel[] = [];
  for (const it of items) {
    const n = byId.get(it.novel_id);
    if (!n) continue;
    out.push({ ...n, reason_key: it.reason_key, reason_params: it.reason_params, score: Number(it.score) });
  }
  return out;
}

/** More Like This — for novel pages. */
export async function fetchMoreLikeThis(novelId: string, limit = 8): Promise<RecNovel[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("rec_more_like_this", { p_novel_id: novelId, p_limit: limit });
  if (error) return [];
  const items = (data ?? []) as RecItem[];
  if (items.length === 0) return [];
  const novels = await fetchNovelsByIds(items.map((i) => i.novel_id));
  const byId = new Map(novels.map((n) => [n.id, n]));
  return items
    .map((it) => {
      const n = byId.get(it.novel_id);
      if (!n) return null;
      return { ...n, reason_key: it.reason_key, reason_params: it.reason_params, score: Number(it.score) } as RecNovel;
    })
    .filter((x): x is RecNovel => x !== null);
}

export type FeedbackType = "like" | "hide" | "not_interested" | "already_read";

export async function submitRecFeedback(novelId: string, feedback: FeedbackType) {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false as const, error: "not_authenticated" };
  const { error } = await supabase
    .from("recommendation_feedback")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .insert({ user_id: userData.user.id, novel_id: novelId, feedback } as any);
  if (error && !String(error.message).toLowerCase().includes("duplicate")) {
    return { ok: false as const, error: error.message };
  }
  return { ok: true as const };
}
