import { supabase } from "@/integrations/supabase/client";

/** Stable hash of a text selection so reactions/comments can cluster on the same quote. */
export function hashSelection(text: string): string {
  const s = text.trim().replace(/\s+/g, " ");
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + "-" + s.length;
}

/* ------------ Text reactions ------------ */

export interface TextReactionRow {
  id: string;
  user_id: string;
  emoji: string;
  selection_hash: string;
  selection_text: string;
  created_at: string;
}

export async function fetchChapterReactions(chapterId: string): Promise<TextReactionRow[]> {
  const { data, error } = await supabase
    .from("text_reactions")
    .select("id,user_id,emoji,selection_hash,selection_text,created_at")
    .eq("chapter_id", chapterId);
  if (error) throw error;
  return (data ?? []) as TextReactionRow[];
}

export async function toggleTextReaction(input: {
  chapter_id: string;
  selection_hash: string;
  selection_text: string;
  emoji: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  const { data: existing } = await supabase
    .from("text_reactions")
    .select("id")
    .eq("user_id", u.user.id)
    .eq("chapter_id", input.chapter_id)
    .eq("selection_hash", input.selection_hash)
    .eq("emoji", input.emoji)
    .maybeSingle();
  if (existing) {
    await supabase.from("text_reactions").delete().eq("id", existing.id);
    return "removed" as const;
  }
  const { error } = await supabase.from("text_reactions").insert({
    user_id: u.user.id,
    chapter_id: input.chapter_id,
    selection_hash: input.selection_hash,
    selection_text: input.selection_text.slice(0, 500),
    emoji: input.emoji,
  });
  if (error) throw error;
  return "added" as const;
}

/* ------------ Comments (threaded + inline) ------------ */

export interface CommentRow {
  id: string;
  content: string;
  created_at: string;
  parent_id: string | null;
  is_pinned: boolean;
  is_spoiler: boolean;
  likes_count: number;
  selection_text: string | null;
  selection_hash: string | null;
  user_id: string;
  profile: { username: string; avatar_url: string | null; display_name: string | null } | null;
  liked_by_me?: boolean;
}

export async function fetchThreadedComments(scope: {
  chapterId?: string;
  novelId?: string;
}): Promise<CommentRow[]> {
  const buildQuery = (columns: string) => {
    let q = supabase
      .from("comments")
      .select(columns)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: true });
    if (scope.chapterId) q = q.eq("chapter_id", scope.chapterId);
    else if (scope.novelId) q = q.eq("novel_id", scope.novelId).is("chapter_id", null);
    return q;
  };

  const initial = await buildQuery(
    "id,content,created_at,parent_id,is_pinned,is_spoiler,likes_count,selection_text,selection_hash,user_id",
  );
  let data = initial.data as unknown[] | null;
  let error = initial.error;

  if (error) {
    const canRetryWithPublicColumns =
      error.code === "42501" ||
      error.code === "42703" ||
      error.message.toLowerCase().includes("permission denied") ||
      error.message.toLowerCase().includes("column");

    if (canRetryWithPublicColumns) {
      const fallback = await buildQuery(
        "id,content,created_at,parent_id,is_pinned,likes_count",
      );
      data = ((fallback.data ?? []) as unknown as Array<Record<string, unknown>>).map((comment) => ({
        ...comment,
        user_id: "",
        is_spoiler: false,
        selection_text: null,
        selection_hash: null,
      }));
      error = fallback.error;
    }
  }

  if (error) throw error;

  const comments = (data ?? []) as unknown as Omit<CommentRow, "profile">[];
  const userIds = Array.from(
    new Set(comments.map((comment) => comment.user_id).filter(Boolean)),
  );

  if (userIds.length === 0) {
    return comments.map((comment) => ({
      ...comment,
      profile: null,
    }));
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles_public")
    .select("id,username,avatar_url,display_name")
    .in("id", userIds);
  if (profilesError) {
    console.warn("[comments] failed to load public profiles", profilesError);
  }

  const profileMap = new Map(
    (profiles ?? [])
      .filter((profile) => profile.id && profile.username)
      .map((profile) => [
        profile.id as string,
        {
          username: profile.username as string,
          avatar_url: profile.avatar_url,
          display_name: profile.display_name,
        },
      ]),
  );

  return comments.map((comment) => ({
    ...comment,
    profile: profileMap.get(comment.user_id) ?? null,
  }));
}

export async function postComment(input: {
  novel_id?: string | null;
  chapter_id?: string | null;
  content: string;
  parent_id?: string | null;
  is_spoiler?: boolean;
  selection_text?: string | null;
  selection_hash?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  const { error } = await supabase
    .from("comments")
    .insert({
      user_id: u.user.id,
      novel_id: input.novel_id ?? null,
      chapter_id: input.chapter_id ?? null,
      content: input.content.trim(),
      parent_id: input.parent_id ?? null,
      is_spoiler: input.is_spoiler ?? false,
      selection_text: input.selection_text ?? null,
      selection_hash: input.selection_hash ?? null,
    });
  if (error) throw error;
}


export async function toggleCommentLike(commentId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  const { data: existing } = await supabase
    .from("comment_likes")
    .select("comment_id")
    .eq("comment_id", commentId)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (existing) {
    await supabase
      .from("comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", u.user.id);
    return "removed" as const;
  }
  await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: u.user.id });
  return "added" as const;
}

export async function togglePinComment(commentId: string, next: boolean) {
  const { error } = await supabase.from("comments").update({ is_pinned: next }).eq("id", commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}

/* ------------ Reviews (on novels via ratings) ------------ */

export interface ReviewRow {
  id: string;
  user_id: string;
  score: number;
  review_title: string | null;
  review_body: string | null;
  likes_count: number;
  created_at: string;
  profile: { username: string; avatar_url: string | null; display_name: string | null } | null;
  liked_by_me?: boolean;
}

export async function fetchReviews(novelId: string): Promise<ReviewRow[]> {
  const { data, error } = await supabase
    .from("ratings")
    .select(
      "id,user_id,score,review_title,review_body,likes_count,created_at,profile:profiles!ratings_user_id_fkey(username,avatar_url,display_name)",
    )
    .eq("novel_id", novelId)
    .order("likes_count", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as ReviewRow[];
}

export async function fetchRatingDistribution(novelId: string): Promise<Record<number, number>> {
  const { data, error } = await supabase.from("ratings").select("score").eq("novel_id", novelId);
  if (error) throw error;
  const out: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  (data ?? []).forEach((r) => {
    out[r.score] = (out[r.score] ?? 0) + 1;
  });
  return out;
}

export async function fetchMyReview(novelId: string): Promise<ReviewRow | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("ratings")
    .select("id,user_id,score,review_title,review_body,likes_count,created_at")
    .eq("novel_id", novelId)
    .eq("user_id", u.user.id)
    .maybeSingle();
  return (data ?? null) as unknown as ReviewRow | null;
}

export async function upsertReview(input: {
  novel_id: string;
  score: number;
  review_title?: string;
  review_body?: string;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");

  const patch = {
    score: input.score,
    review_title: input.review_title?.trim() || null,
    review_body: input.review_body?.trim() || null,
  };

  // Check if a review already exists — update it, otherwise insert.
  // Splitting insert/update avoids column-level UPDATE grants rejecting
  // user_id/novel_id in the upsert path on the production database.
  const { data: existing } = await supabase
    .from("ratings")
    .select("id")
    .eq("novel_id", input.novel_id)
    .eq("user_id", u.user.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ratings")
      .update(patch)
      .eq("id", existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("ratings").insert({
    user_id: u.user.id,
    novel_id: input.novel_id,
    ...patch,
  });
  if (error) throw error;
}

export async function toggleReviewLike(ratingId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  const { data: existing } = await supabase
    .from("review_likes")
    .select("rating_id")
    .eq("rating_id", ratingId)
    .eq("user_id", u.user.id)
    .maybeSingle();
  if (existing) {
    await supabase.from("review_likes").delete().eq("rating_id", ratingId).eq("user_id", u.user.id);
    return "removed" as const;
  }
  await supabase.from("review_likes").insert({ rating_id: ratingId, user_id: u.user.id });
  return "added" as const;
}

/* ------------ Similar novels ------------ */

export async function fetchSimilarNovels(novelId: string, limit = 8) {
  // pull genres for this novel, then find other novels sharing those genres
  const { data: g } = await supabase
    .from("novel_genres")
    .select("genre_id")
    .eq("novel_id", novelId);
  const genreIds = (g ?? []).map((r) => r.genre_id);
  if (genreIds.length === 0) return [];
  const { data: linkage } = await supabase
    .from("novel_genres")
    .select("novel_id")
    .in("genre_id", genreIds)
    .neq("novel_id", novelId)
    .limit(60);
  const ids = Array.from(new Set((linkage ?? []).map((r) => r.novel_id))).slice(0, limit);
  if (ids.length === 0) return [];
  const { data: novels } = await supabase
    .from("novels")
    .select("id,slug,title,author,cover_url,status,views_count,rating_avg")
    .in("id", ids)
    .eq("is_published", true)
    .limit(limit);
  return novels ?? [];
}
