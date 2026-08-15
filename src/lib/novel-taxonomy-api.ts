// Novel taxonomy API — categories (public.genres) and their tags (public.tags
// linked through public.genre_tags). Reuses the existing tables; nothing new
// is created from the novel form.
import { supabase } from "@/integrations/supabase/client";

export interface TaxCategory {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
}

export interface TaxTag {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  /** Categories this tag belongs to (a tag may belong to several). */
  genre_ids: string[];
}

const db = supabase as unknown as {
  from: (table: string) => any;
};

/** All categories, sorted by Arabic name. */
export async function fetchTaxCategories(): Promise<TaxCategory[]> {
  const { data, error } = await db
    .from("genres")
    .select("id,slug,name_ar,name_en")
    .order("name_ar", { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaxCategory[];
}

/** All tags with the list of categories each one belongs to. */
export async function fetchTaxTags(): Promise<TaxTag[]> {
  const [tagsRes, linksRes] = await Promise.all([
    db.from("tags").select("id,slug,name_ar,name_en").order("name_ar", { ascending: true }),
    db.from("genre_tags").select("genre_id,tag_id"),
  ]);
  if (tagsRes.error) throw tagsRes.error;
  if (linksRes.error) throw linksRes.error;

  const byTag = new Map<string, string[]>();
  for (const row of (linksRes.data ?? []) as { genre_id: string; tag_id: string }[]) {
    const list = byTag.get(row.tag_id) ?? [];
    list.push(row.genre_id);
    byTag.set(row.tag_id, list);
  }
  return ((tagsRes.data ?? []) as Omit<TaxTag, "genre_ids">[]).map((t) => ({
    ...t,
    genre_ids: byTag.get(t.id) ?? [],
  }));
}

/** Tags belonging to one category (used by the public category page). */
export async function fetchCategoryTags(genreId: string): Promise<TaxTag[]> {
  const { data, error } = await db
    .from("genre_tags")
    .select("tag:tags(id,slug,name_ar,name_en)")
    .eq("genre_id", genreId);
  if (error) throw error;
  return ((data ?? []) as { tag: Omit<TaxTag, "genre_ids"> | null }[])
    .map((r) => r.tag)
    .filter((t): t is Omit<TaxTag, "genre_ids"> => !!t)
    .map((t) => ({ ...t, genre_ids: [genreId] }))
    .sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar"));
}

/** Novel ids that carry at least one of the given tags. */
export async function fetchNovelIdsByTags(tagIds: string[]): Promise<Set<string>> {
  if (!tagIds.length) return new Set();
  const { data, error } = await db.from("novel_tags").select("novel_id").in("tag_id", tagIds);
  if (error) throw error;
  return new Set((data ?? []).map((r: { novel_id: string }) => r.novel_id));
}

/** Saved categories + tags of a novel. */
export async function fetchNovelTaxonomy(
  novelId: string,
): Promise<{ genreIds: string[]; tagIds: string[] }> {
  const [g, t] = await Promise.all([
    db.from("novel_genres").select("genre_id").eq("novel_id", novelId),
    db.from("novel_tags").select("tag_id").eq("novel_id", novelId),
  ]);
  if (g.error) throw g.error;
  if (t.error) throw t.error;
  return {
    genreIds: (g.data ?? []).map((r: { genre_id: string }) => r.genre_id),
    tagIds: (t.data ?? []).map((r: { tag_id: string }) => r.tag_id),
  };
}

/** Replace the novel's categories and tags with the given selection. */
export async function saveNovelTaxonomy(
  novelId: string,
  genreIds: string[],
  tagIds: string[],
): Promise<void> {
  const uniqueGenres = [...new Set(genreIds)];
  const uniqueTags = [...new Set(tagIds)];

  await db.from("novel_genres").delete().eq("novel_id", novelId);
  if (uniqueGenres.length) {
    const { error } = await db
      .from("novel_genres")
      .insert(uniqueGenres.map((genre_id) => ({ novel_id: novelId, genre_id })));
    if (error) throw error;
  }

  await db.from("novel_tags").delete().eq("novel_id", novelId);
  if (uniqueTags.length) {
    const { error } = await db
      .from("novel_tags")
      .insert(uniqueTags.map((tag_id) => ({ novel_id: novelId, tag_id })));
    if (error) throw error;
  }
}
