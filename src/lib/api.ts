import { supabase } from "@/integrations/supabase/client";

export interface Novel {
  id: string;
  slug: string;
  title: string;
  original_title: string | null;
  author: string;
  translator: string | null;
  cover_url: string | null;
  description: string;
  status: string;
  is_featured: boolean;
  views_count: number;
  rating_avg: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface Chapter {
  id: string;
  novel_id: string;
  chapter_number: number;
  title: string;
  content: string;
  is_vip: boolean;
  views_count: number;
  created_at: string;
  updated_at: string;
}

export interface Genre {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
}

const NOVEL_CARD_COLS = "id,slug,title,author,cover_url,status,views_count,rating_avg";

export async function fetchNovels(opts: {
  status?: string;
  sort?: "latest" | "popular" | "rating" | "newest";
  limit?: number;
  featured?: boolean;
} = {}) {
  let q = supabase.from("novels").select(NOVEL_CARD_COLS);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.featured) q = q.eq("is_featured", true);
  const sort = opts.sort ?? "latest";
  if (sort === "popular") q = q.order("views_count", { ascending: false });
  else if (sort === "rating") q = q.order("rating_avg", { ascending: false });
  else if (sort === "newest") q = q.order("created_at", { ascending: false });
  else q = q.order("updated_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as Novel[];
}

export async function fetchNovelBySlug(slug: string) {
  const { data, error } = await supabase
    .from("novels")
    .select("*, novel_genres(genre:genres(id,slug,name_ar,name_en))")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (Novel & { novel_genres: { genre: Genre }[] }) | null;
}

export async function fetchChapters(novelId: string) {
  const { data, error } = await supabase
    .from("chapters")
    .select("id,chapter_number,title,is_vip,views_count,created_at")
    .eq("novel_id", novelId)
    .order("chapter_number", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchChapter(novelSlug: string, chapterNum: number) {
  const novel = await fetchNovelBySlug(novelSlug);
  if (!novel) return null;
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("novel_id", novel.id)
    .eq("chapter_number", chapterNum)
    .maybeSingle();
  if (error) throw error;
  return data ? { novel, chapter: data as unknown as Chapter } : null;
}

export async function fetchGenres() {
  const { data, error } = await supabase.from("genres").select("*").order("name_ar");
  if (error) throw error;
  return (data ?? []) as unknown as Genre[];
}

export async function fetchLatestChapters(limit = 12) {
  const { data, error } = await supabase
    .from("chapters")
    .select("id,chapter_number,title,created_at,novel:novels(slug,title,cover_url,author)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as {
    id: string; chapter_number: number; title: string; created_at: string;
    novel: { slug: string; title: string; cover_url: string | null; author: string };
  }[];
}

export async function searchNovels(query: string, filters: { genre?: string; status?: string; sort?: string } = {}) {
  let q = supabase.from("novels").select(NOVEL_CARD_COLS);
  if (query.trim()) {
    q = q.or(`title.ilike.%${query}%,author.ilike.%${query}%`);
  }
  if (filters.status) q = q.eq("status", filters.status);
  const sort = filters.sort ?? "latest";
  if (sort === "popular") q = q.order("views_count", { ascending: false });
  else if (sort === "rating") q = q.order("rating_avg", { ascending: false });
  else q = q.order("updated_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  let results = (data ?? []) as unknown as Novel[];
  if (filters.genre) {
    const { data: gnovels } = await supabase
      .from("novel_genres")
      .select("novel_id, genre:genres!inner(slug)")
      .eq("genre.slug", filters.genre);
    const allowed = new Set((gnovels ?? []).map((r: { novel_id: string }) => r.novel_id));
    results = results.filter((n) => allowed.has(n.id));
  }
  return results;
}

export async function fetchNovelsByGenre(genreSlug: string) {
  const { data: g } = await supabase.from("genres").select("id").eq("slug", genreSlug).maybeSingle();
  if (!g) return [];
  const { data } = await supabase
    .from("novel_genres")
    .select("novel:novels(" + NOVEL_CARD_COLS + ")")
    .eq("genre_id", (g as { id: string }).id);
  return ((data ?? []) as { novel: Novel }[]).map((r) => r.novel);
}

export async function incrementNovelView(id: string) {
  await supabase.rpc("increment_novel_view", { _novel_id: id });
}
export async function incrementChapterView(id: string) {
  await supabase.rpc("increment_chapter_view", { _chapter_id: id });
}

export async function fetchComments(target: { novelId?: string; chapterId?: string }) {
  let q = supabase.from("comments").select("*, profile:profiles(username, avatar_url)");
  if (target.chapterId) q = q.eq("chapter_id", target.chapterId);
  else if (target.novelId) q = q.eq("novel_id", target.novelId).is("chapter_id", null);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as {
    id: string; user_id: string; content: string; created_at: string;
    profile: { username: string; avatar_url: string | null } | null;
  }[];
}
