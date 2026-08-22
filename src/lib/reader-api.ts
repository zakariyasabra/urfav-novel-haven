import { supabase } from "@/integrations/supabase/client";

export interface BookmarkRow {
  id: string;
  user_id: string;
  novel_id: string;
  chapter_id: string | null;
  paragraph_index: number | null;
  note: string | null;
  created_at: string;
}

export async function fetchMyBookmarks() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("bookmarks")
    .select(
      "id,created_at,paragraph_index,note,chapter:chapters(id,chapter_number,title),novel:novels(id,slug,title,cover_url,author)",
    )
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function addBookmark(input: {
  novel_id: string;
  chapter_id?: string | null;
  paragraph_index?: number | null;
  note?: string | null;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول أولاً");
  const { error } = await supabase.from("bookmarks").insert({
    user_id: u.user.id,
    novel_id: input.novel_id,
    chapter_id: input.chapter_id ?? null,
    paragraph_index: input.paragraph_index ?? null,
    note: input.note ?? null,
  });
  if (error) throw error;
}

export async function removeBookmark(id: string) {
  const { error } = await supabase.from("bookmarks").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchMyCollections() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("collections")
    .select("id,name,description,is_public,created_at")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createCollection(input: {
  name: string;
  description?: string;
  is_public?: boolean;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  const { data, error } = await supabase
    .from("collections")
    .insert({
      user_id: u.user.id,
      name: input.name,
      description: input.description ?? null,
      is_public: input.is_public ?? false,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function deleteCollection(id: string) {
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchCollectionItems(collectionId: string) {
  const { data, error } = await supabase
    .from("collection_items")
    .select("added_at,novel:novels(id,slug,title,author,cover_url,status,views_count,rating_avg)")
    .eq("collection_id", collectionId)
    .order("added_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as {
    added_at: string;
    novel: {
      id: string;
      slug: string;
      title: string;
      author: string;
      cover_url: string | null;
      status: string;
      views_count: number;
      rating_avg: number;
    };
  }[];
}

export async function addToCollection(collectionId: string, novelId: string) {
  const { error } = await supabase
    .from("collection_items")
    .insert({ collection_id: collectionId, novel_id: novelId });
  if (error) throw error;
}

export async function removeFromCollection(collectionId: string, novelId: string) {
  const { error } = await supabase
    .from("collection_items")
    .delete()
    .eq("collection_id", collectionId)
    .eq("novel_id", novelId);
  if (error) throw error;
}

export async function fetchFollowedAuthors() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("author_follows")
    .select(
      "created_at,author:profiles!author_follows_author_id_fkey(id,username,display_name,avatar_url,is_verified)",
    )
    .eq("follower_id", u.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface AuthorProfileData {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  is_verified: boolean;
  social_links: Record<string, string>;
  country_code: string | null;
  created_at: string;
}

const AUTHOR_PUBLIC_COLS =
  "id,username,display_name,bio,avatar_url,cover_url,is_verified,social_links,created_at";

export async function fetchAuthorByUsername(username: string): Promise<AuthorProfileData | null> {
  // `country_code` is not readable by anonymous visitors (and during SSR), so we
  // ask for it separately and fall back to the public columns when it's denied.
  const full = await supabase
    .from("profiles")
    .select(`${AUTHOR_PUBLIC_COLS},country_code`)
    .eq("username", username)
    .maybeSingle();
  if (!full.error) return (full.data ?? null) as unknown as AuthorProfileData | null;

  const { data, error } = await supabase
    .from("profiles")
    .select(AUTHOR_PUBLIC_COLS)
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as AuthorProfileData | null;
}


export async function fetchAuthorNovels(userId: string) {
  const { data, error } = await supabase
    .from("novels")
    .select("id,slug,title,author,cover_url,status,views_count,rating_avg,is_published,is_upcoming")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function toggleFollowAuthor(authorId: string, follow: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  if (follow) {
    const { error } = await supabase
      .from("author_follows")
      .insert({ follower_id: u.user.id, author_id: authorId });
    if (error && !error.message.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase
      .from("author_follows")
      .delete()
      .eq("follower_id", u.user.id)
      .eq("author_id", authorId);
    if (error) throw error;
  }
}

export async function isFollowingAuthor(authorId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase
    .from("author_follows")
    .select("author_id")
    .eq("follower_id", u.user.id)
    .eq("author_id", authorId)
    .maybeSingle();
  return !!data;
}

export async function fetchAuthorFollowerCount(authorId: string): Promise<number> {
  const { count } = await supabase
    .from("author_follows")
    .select("*", { count: "exact", head: true })
    .eq("author_id", authorId);
  return count ?? 0;
}

export async function fetchAuthorStats(authorId: string) {
  const [novelsRes, followersRes, ratingsRes, viewsRes, chapterCountsRes] = await Promise.all([
    supabase
      .from("novels")
      .select("id, views_count, rating_avg, rating_count, is_published, is_upcoming", { count: "exact" })
      .eq("owner_id", authorId),
    supabase
      .from("author_follows")
      .select("*", { count: "exact", head: true })
      .eq("author_id", authorId),
    supabase
      .from("novels")
      .select("rating_avg, rating_count")
      .eq("owner_id", authorId)
      .eq("is_published", true),
    supabase
      .from("novels")
      .select("views_count")
      .eq("owner_id", authorId),
    supabase
      .from("novels")
      .select("id")
      .eq("owner_id", authorId)
  ]);

  const novels = novelsRes.data ?? [];
  const publishedNovels = novels.filter((n) => n.is_published && !n.is_upcoming);

  const totalViews = (viewsRes.data ?? []).reduce((acc, curr) => acc + (curr.views_count || 0), 0);
  const followers = followersRes.count ?? 0;

  let totalScore = 0;
  let totalRatingsCount = 0;

  for (const n of (ratingsRes.data ?? [])) {
    const count = n.rating_count ?? 0;
    const avg = n.rating_avg ?? 0;
    if (count > 0) {
      totalScore += avg * count;
      totalRatingsCount += count;
    }
  }

  const avgRating = totalRatingsCount > 0 ? totalScore / totalRatingsCount : 0;

  return {
    novelsCount: novels.length,
    novelsPublished: publishedNovels.length,
    totalViews,
    followers,
    avgRating,
    totalRatings: totalRatingsCount,
  };
}

export async function fetchNovelChapterCounts(novelIds: string[]): Promise<Record<string, number>> {
  if (!novelIds || novelIds.length === 0) return {};

  const { data, error } = await supabase
    .from("chapters")
    .select("novel_id")
    .eq("status", "published")
    .in("novel_id", novelIds);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const item of (data ?? [])) {
    counts[item.novel_id] = (counts[item.novel_id] || 0) + 1;
  }

  return counts;
}
