import { supabase } from "@/integrations/supabase/client";
import { pickText, type Lang } from "@/lib/i18n-content";

// Auto-detect the current UI language from localStorage so every existing
// caller respects the language toggle without threading `lang` through.
function currentLang(): Lang {
  if (typeof window === "undefined") return "ar";
  try {
    const v = window.localStorage.getItem("urfav_lang");
    return v === "en" ? "en" : "ar";
  } catch {
    return "ar";
  }
}

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
  is_premium?: boolean;
  coin_price?: number;
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

// We select the bilingual + legacy columns and resolve to the caller's lang.
const NOVEL_CARD_COLS =
  "id,slug,title,title_ar,title_en,author,author_display_ar,author_display_en,cover_url,status,views_count,rating_avg";
const NOVEL_FULL_COLS =
  "id,slug,title,title_ar,title_en,original_title,original_title_ar,original_title_en,author,author_display_ar,author_display_en,translator,translator_ar,translator_en,cover_url,description,description_ar,description_en,status,is_featured,views_count,rating_avg,rating_count,created_at,updated_at,is_premium,coin_price,owner_id";

type NovelRow = Record<string, unknown> & {
  id: string;
  slug: string;
  title: string;
  title_ar?: string | null;
  title_en?: string | null;
  author: string;
  author_display_ar?: string | null;
  author_display_en?: string | null;
  original_title?: string | null;
  original_title_ar?: string | null;
  original_title_en?: string | null;
  translator?: string | null;
  translator_ar?: string | null;
  translator_en?: string | null;
  description?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  cover_url: string | null;
  status: string;
  is_featured?: boolean;
  views_count: number;
  rating_avg: number;
  rating_count?: number;
  created_at?: string;
  updated_at?: string;
  is_premium?: boolean;
  coin_price?: number;
  owner_id?: string | null;
};

function resolveNovel(row: NovelRow, lang: Lang): Novel {
  return {
    id: row.id,
    slug: row.slug,
    title: pickText(row.title_ar, row.title_en, lang) || row.title,
    original_title:
      pickText(row.original_title_ar, row.original_title_en, lang) || (row.original_title ?? null),
    author: pickText(row.author_display_ar, row.author_display_en, lang) || row.author,
    translator: pickText(row.translator_ar, row.translator_en, lang) || (row.translator ?? null),
    cover_url: row.cover_url,
    description: pickText(row.description_ar, row.description_en, lang) || (row.description ?? ""),
    status: row.status,
    is_featured: !!row.is_featured,
    views_count: row.views_count ?? 0,
    rating_avg: Number(row.rating_avg ?? 0),
    rating_count: row.rating_count ?? 0,
    created_at: row.created_at ?? "",
    updated_at: row.updated_at ?? "",
    is_premium: !!row.is_premium,
    coin_price: Number(row.coin_price ?? 0),
  };
}

export async function fetchNovels(
  opts: {
    status?: string;
    sort?: "latest" | "popular" | "rating" | "newest";
    limit?: number;
    featured?: boolean;
    lang?: Lang;
  } = {},
) {
  const lang: Lang = opts.lang ?? currentLang();
  let q = supabase.from("novels").select(NOVEL_CARD_COLS);
  if (opts.status) q = q.eq("status", opts.status as "ongoing" | "completed" | "hiatus");
  if (opts.featured) q = q.eq("is_featured", true);
  const sort = opts.sort ?? "latest";
  if (sort === "popular") q = q.order("views_count", { ascending: false });
  else if (sort === "rating") q = q.order("rating_avg", { ascending: false });
  else if (sort === "newest") q = q.order("created_at", { ascending: false });
  else q = q.order("updated_at", { ascending: false });
  if (opts.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw error;
  return ((data ?? []) as unknown as NovelRow[]).map((r) => resolveNovel(r, lang));
}

/** Fetch novels for a set of IDs (used by recommendation hydration). Returns published only. */
export async function fetchNovelsByIds(
  ids: string[],
  lang: Lang = currentLang(),
): Promise<Novel[]> {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from("novels")
    .select(NOVEL_FULL_COLS)
    .in("id", ids)
    .eq("is_published", true);
  if (error) throw error;
  return ((data ?? []) as unknown as NovelRow[]).map((r) => resolveNovel(r, lang));
}

export async function fetchNovelBySlug(slug: string, lang: Lang = currentLang()) {
  const { data, error } = await supabase
    .from("novels")
    .select(`${NOVEL_FULL_COLS}, novel_genres(genre:genres(id,slug,name_ar,name_en))`)
    .eq("slug", slug)
    .maybeSingle();
    
  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as NovelRow & { novel_genres: { genre: Genre }[] };
  
  let profile = null;
  if (row.owner_id) {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", row.owner_id)
      .maybeSingle();
    profile = profileData;
  }

  const base = resolveNovel(row, lang);
  return { 
    ...base, 
    novel_genres: row.novel_genres ?? [],
    author_profile: profile ?? null,
  } as Novel & {
    novel_genres: { genre: Genre }[];
    author_profile: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
  };
}

export async function fetchChapters(novelId: string, lang: Lang = currentLang()) {
  // القائمة العامة: الفصول المنشورة فقط (بدون المسودات/المجدولة/المحذوفة)
  const base = () =>
    supabase
      .from("chapters")
      .select("id,chapter_number,title,title_ar,title_en,is_vip,views_count,created_at,status")
      .eq("novel_id", novelId)
      .eq("status", "published")
      .order("chapter_number", { ascending: true });
  let { data, error } = await base().is("deleted_at", null);
  // قواعد قديمة بدون عمود deleted_at
  if (error && (error.code === "42703" || error.code === "PGRST204")) {
    ({ data, error } = await base());
  }
  if (error) throw error;
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: c.id as string,
    chapter_number: c.chapter_number as number,
    title:
      pickText(c.title_ar as string | null, c.title_en as string | null, lang) ||
      (c.title as string),
    is_vip: !!c.is_vip,
    views_count: (c.views_count as number) ?? 0,
    created_at: c.created_at as string,
  }));
}

export async function fetchChapter(
  novelSlug: string,
  chapterNum: number,
  lang: Lang = currentLang(),
) {
  const novel = await fetchNovelBySlug(novelSlug, lang);
  if (!novel) return null;
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("novel_id", novel.id)
    .eq("chapter_number", chapterNum)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  // لا تعرض المسودات/المجدولة/المحذوفة للقرّاء
  const st = (data as Record<string, unknown>).status;
  const del = (data as Record<string, unknown>).deleted_at;
  if ((st && st !== "published") || del) return null;
  const row = data as Record<string, unknown>;
  const chapter = {
    ...(row as unknown as Chapter),
    title:
      pickText(row.title_ar as string | null, row.title_en as string | null, lang) ||
      (row.title as string),
    content:
      pickText(row.content_ar as string | null, row.content_en as string | null, lang) ||
      (row.content as string),
  } as Chapter;
  return { novel, chapter };
}

export async function fetchGenres() {
  const { data, error } = await supabase.from("genres").select("*").order("name_ar");
  if (error) throw error;
  return (data ?? []) as unknown as Genre[];
}

export async function fetchLatestChapters(limit = 12, lang: Lang = currentLang()) {
  const { data, error } = await supabase
    .from("chapters")
    .select(
      "id,chapter_number,title,title_ar,title_en,created_at,novel:novels(slug,title,title_ar,title_en,cover_url,author,author_display_ar,author_display_en)",
    )
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r: Record<string, unknown>) => {
    const n = r.novel as Record<string, unknown>;
    return {
      id: r.id as string,
      chapter_number: r.chapter_number as number,
      title:
        pickText(r.title_ar as string | null, r.title_en as string | null, lang) ||
        (r.title as string),
      created_at: r.created_at as string,
      novel: {
        slug: n.slug as string,
        title:
          pickText(n.title_ar as string | null, n.title_en as string | null, lang) ||
          (n.title as string),
        cover_url: (n.cover_url as string | null) ?? null,
        author:
          pickText(
            n.author_display_ar as string | null,
            n.author_display_en as string | null,
            lang,
          ) || (n.author as string),
      },
    };
  });
}

export async function searchNovels(
  query: string,
  filters: { genre?: string; status?: string; sort?: string; lang?: Lang } = {},
) {
  const lang: Lang = filters.lang ?? currentLang();
  let q = supabase.from("novels").select(NOVEL_CARD_COLS);
  const raw = query.trim();
  if (raw) {
    const safe = raw
      .replace(/[,\.\(\)"'\\%*]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 100);
    if (safe) {
      const pattern = `%${safe}%`;
      q = q.or(
        `title.ilike.${pattern},title_ar.ilike.${pattern},title_en.ilike.${pattern},author.ilike.${pattern},author_display_ar.ilike.${pattern},author_display_en.ilike.${pattern}`,
      );
    }
  }
  if (filters.status) q = q.eq("status", filters.status as "ongoing" | "completed" | "hiatus");
  const sort = filters.sort ?? "latest";
  if (sort === "popular") q = q.order("views_count", { ascending: false });
  else if (sort === "rating") q = q.order("rating_avg", { ascending: false });
  else q = q.order("updated_at", { ascending: false });
  const { data, error } = await q;
  if (error) throw error;
  let results = ((data ?? []) as unknown as NovelRow[]).map((r) => resolveNovel(r, lang));
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

export async function fetchNovelsByGenre(genreSlug: string, lang: Lang = currentLang()) {
  const { data: g } = await supabase
    .from("genres")
    .select("id")
    .eq("slug", genreSlug)
    .maybeSingle();
  if (!g) return [];
  const { data } = await supabase
    .from("novel_genres")
    .select("novel:novels(" + NOVEL_CARD_COLS + ")")
    .eq("genre_id", (g as { id: string }).id);
  return ((data ?? []) as unknown as { novel: NovelRow }[]).map((r) => resolveNovel(r.novel, lang));
}

// View recording now goes through record_* RPCs (real event rows + dedup).
export async function incrementNovelView(id: string) {
  const { recordNovelView } = await import("@/lib/views-api");
  await recordNovelView(id);
}
export async function incrementChapterView(id: string) {
  const { recordChapterView } = await import("@/lib/views-api");
  await recordChapterView(id);
}

export async function fetchComments(
  target: string | { novelId?: string; chapterId?: string }
) {
  let novelId: string | undefined;
  let chapterId: string | undefined;

  if (typeof target === "string") {
    novelId = target;
  } else {
    novelId = target.novelId;
    chapterId = target.chapterId;
  }

  let q = supabase
    .from("comments")
    .select(`
      id,
      user_id,
      content,
      created_at
    `);

  if (chapterId) {
    q = q.eq("chapter_id", chapterId);
  } else if (novelId) {
    q = q.eq("novel_id", novelId).is("chapter_id", null);
  }
  
  const { data, error } = await q.order("created_at", { ascending: false }).limit(50);
  if (error) throw error;

  const comments = (data ?? []) as unknown as {
    id: string;
    user_id: string;
    content: string;
    created_at: string;
  }[];

  if (comments.length === 0) return [];

  const userIds = [...new Set(comments.map((c) => c.user_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id, p])
  );

  return comments.map((c) => ({
    id: c.id,
    content: c.content,
    created_at: c.created_at,
    profile: profileMap.get(c.user_id) ?? null,
  }));
}
