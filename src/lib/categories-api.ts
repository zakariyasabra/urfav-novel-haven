// Categories API — thin wrapper over public.genres / public.novel_genres.
// Reuses the existing tables so we don't fork the taxonomy.
import { supabase } from "@/integrations/supabase/client";

export interface Category {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  color: string | null;
  cover_url: string | null;
  sort_order: number;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type CategoryInput = Partial<
  Omit<Category, "id" | "created_at" | "updated_at">
> & {
  name_ar: string;
  slug: string;
};

const COLS =
  "id,slug,name_ar,name_en,description_ar,description_en,icon,color,cover_url,sort_order,is_featured,is_active,created_at,updated_at";

export function slugifyCategory(s: string) {
  return (
    s
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\u0600-\u06FF-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || `category-${Date.now()}`
  );
}

export interface ListCategoriesOpts {
  search?: string;
  sort?: "sort_order" | "name_ar" | "created_at" | "updated_at";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}

export async function listCategories(opts: ListCategoriesOpts = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  let q = supabase.from("genres").select(COLS, { count: "exact" });
  if (opts.activeOnly) q = q.eq("is_active" as never, true as never);
  const raw = (opts.search ?? "").trim();
  if (raw) {
    const safe = raw.replace(/[,\.\(\)"'\\%*]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
    if (safe) {
      const p = `%${safe}%`;
      q = q.or(`name_ar.ilike.${p},name_en.ilike.${p},slug.ilike.${p}`);
    }
  }
  const sort = opts.sort ?? "sort_order";
  const asc = (opts.direction ?? "asc") === "asc";
  q = q.order(sort, { ascending: asc });
  if (sort !== "name_ar") q = q.order("name_ar", { ascending: true });
  q = q.range(from, to);
  const { data, error, count } = await q;
  if (error) throw error;
  return {
    items: (data ?? []) as unknown as Category[],
    total: count ?? 0,
    page,
    pageSize,
  };
}

export async function getCategoryBySlug(slug: string) {
  const { data, error } = await supabase
    .from("genres")
    .select(COLS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Category | null;
}

export async function createCategory(input: CategoryInput) {
  const payload = {
    slug: input.slug,
    name_ar: input.name_ar,
    name_en: input.name_en ?? null,
    description_ar: input.description_ar ?? null,
    description_en: input.description_en ?? null,
    icon: input.icon ?? null,
    color: input.color ?? null,
    cover_url: input.cover_url ?? null,
    sort_order: input.sort_order ?? 0,
    is_featured: input.is_featured ?? false,
    is_active: input.is_active ?? true,
  };
  const { data, error } = await supabase
    .from("genres")
    .insert(payload as never)
    .select(COLS)
    .single();
  if (error) throw error;
  return data as unknown as Category;
}

export async function updateCategory(id: string, patch: Partial<CategoryInput>) {
  const { data, error } = await supabase
    .from("genres")
    .update(patch as never)
    .eq("id", id)
    .select(COLS)
    .single();
  if (error) throw error;
  return data as unknown as Category;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from("genres").delete().eq("id", id);
  if (error) throw error;
}

/** Count novels linked to a category (used for delete protection). */
export async function categoryNovelCount(id: string): Promise<number> {
  const { count, error } = await supabase
    .from("novel_genres")
    .select("*", { count: "exact", head: true })
    .eq("genre_id", id);
  if (error) throw error;
  return count ?? 0;
}

/** Novel counts keyed by category id (used by the admin list & public index). */
export async function fetchCategoryCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("novel_genres").select("genre_id");
  if (error) throw error;
  const map: Record<string, number> = {};
  for (const row of (data ?? []) as { genre_id: string }[]) {
    map[row.genre_id] = (map[row.genre_id] ?? 0) + 1;
  }
  return map;
}
