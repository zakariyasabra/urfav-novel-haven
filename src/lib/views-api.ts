// Real views tracking + analytics.
// Backed by public.view_events + record_* / *_views_* RPCs (sql/views_analytics.sql).
// No numbers are fabricated anywhere: every count comes from stored events.
import { supabase } from "@/integrations/supabase/client";

// New RPCs are not in the generated types yet; call them through a loose signature.
const rpc = supabase.rpc.bind(supabase) as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

const VISITOR_KEY = "favnol_visitor_id";
const THROTTLE_MS = 30 * 60 * 1000; // matches the 30-minute dedup window in SQL

function visitorId(): string {
  if (typeof localStorage === "undefined") return "";
  let v = localStorage.getItem(VISITOR_KEY);
  if (!v) {
    v =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `v${Date.now()}${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR_KEY, v);
  }
  return v;
}

/** Client-side guard so a refresh loop does not even hit the network. */
function throttled(key: string): boolean {
  if (typeof sessionStorage === "undefined") return false;
  const k = `vw:${key}`;
  const last = Number(sessionStorage.getItem(k) ?? 0);
  if (Date.now() - last < THROTTLE_MS) return true;
  sessionStorage.setItem(k, String(Date.now()));
  return false;
}

export async function recordNovelView(novelId: string): Promise<void> {
  if (!novelId || throttled(`n:${novelId}`)) return;
  const { error } = await rpc("record_novel_view", {
    _novel_id: novelId,
    _visitor: visitorId(),
  });
  if (error) console.warn("[views] novel view not recorded:", error.message);
}

export async function recordChapterView(chapterId: string): Promise<void> {
  if (!chapterId || throttled(`c:${chapterId}`)) return;
  const { error } = await rpc("record_chapter_view", {
    _chapter_id: chapterId,
    _visitor: visitorId(),
  });
  if (error) console.warn("[views] chapter view not recorded:", error.message);
}

/* ----------------------------- analytics ----------------------------- */

export interface AdminViewsOverview {
  novel_views_counter: number;
  chapter_views_counter: number;
  views_total: number;
  novel_views: number;
  chapter_views: number;
  views_today: number;
  views_7d: number;
  views_30d: number;
  visitors_total: number;
  visitors_7d: number;
  visitors_30d: number;
}

export interface ViewsPoint {
  day: string;
  views: number;
  novel_views: number;
  chapter_views: number;
  visitors: number;
}

export async function fetchAdminViewsOverview(): Promise<AdminViewsOverview> {
  const { data, error } = await rpc("admin_views_overview");
  if (error) throw new Error(error.message);
  return data as AdminViewsOverview;
}

export async function fetchAdminViewsTimeseries(days: number): Promise<ViewsPoint[]> {
  const { data, error } = await rpc("admin_views_timeseries", { _days: days });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    day: String(r.day),
    views: Number(r.views ?? 0),
    novel_views: Number(r.novel_views ?? 0),
    chapter_views: Number(r.chapter_views ?? 0),
    visitors: Number(r.visitors ?? 0),
  }));
}

export interface CreatorViewsOverview {
  novel_views_counter: number;
  chapter_views_counter: number;
  views_total: number;
  views_7d: number;
  views_30d: number;
  chapter_views: number;
  visitors_total: number;
  visitors_30d: number;
}

export interface CreatorNovelViews {
  novel_id: string;
  title: string;
  slug: string;
  views_total: number;
  views_period: number;
  chapter_views: number;
  visitors: number;
}

export async function fetchCreatorViewsOverview(): Promise<CreatorViewsOverview> {
  const { data, error } = await rpc("creator_views_overview");
  if (error) throw new Error(error.message);
  return data as CreatorViewsOverview;
}

export async function fetchCreatorNovelViews(days = 30): Promise<CreatorNovelViews[]> {
  const { data, error } = await rpc("creator_novel_views", { _days: days });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    novel_id: String(r.novel_id),
    title: String(r.title ?? ""),
    slug: String(r.slug ?? ""),
    views_total: Number(r.views_total ?? 0),
    views_period: Number(r.views_period ?? 0),
    chapter_views: Number(r.chapter_views ?? 0),
    visitors: Number(r.visitors ?? 0),
  }));
}

export interface CreatorChapterViews {
  chapter_id: string;
  chapter_number: number;
  title: string;
  views_total: number;
  views_period: number;
  visitors: number;
}

export async function fetchCreatorChapterViews(
  novelId: string,
  days = 30,
): Promise<CreatorChapterViews[]> {
  const { data, error } = await rpc("creator_chapter_views", {
    _novel_id: novelId,
    _days: days,
  });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    chapter_id: String(r.chapter_id),
    chapter_number: Number(r.chapter_number ?? 0),
    title: String(r.title ?? ""),
    views_total: Number(r.views_total ?? 0),
    views_period: Number(r.views_period ?? 0),
    visitors: Number(r.visitors ?? 0),
  }));
}
