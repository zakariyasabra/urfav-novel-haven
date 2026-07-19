// Batch 7G — Creator Studio client API.
// Thin wrappers over creator_* RPCs. All are authenticated-only.
import { supabase } from "@/integrations/supabase/client";

export interface CreatorKpis {
  novels_total: number;
  novels_published: number;
  chapters_total: number;
  chapters_published: number;
  chapters_scheduled: number;
  chapters_draft: number;
  unique_readers: number;
  reads_7d: number;
  reads_30d: number;
  favorites: number;
  followers: number;
  views_total: number;
  rating_avg: number;
  rating_count: number;
  coins_lifetime: number;
  coins_30d: number;
}
export async function fetchCreatorKpis(): Promise<CreatorKpis> {
  const { data, error } = await supabase.rpc("creator_kpis");
  if (error) throw error;
  return data as unknown as CreatorKpis;
}

export interface GrowthPoint {
  day: string;
  reads: number;
  new_favorites: number;
  new_followers: number;
}
export async function fetchGrowthTimeseries(days = 30): Promise<GrowthPoint[]> {
  const { data, error } = await supabase.rpc("creator_growth_timeseries", { _days: days });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    day: String(r.day),
    reads: Number(r.reads),
    new_favorites: Number(r.new_favorites),
    new_followers: Number(r.new_followers),
  }));
}

export interface HeatmapCell {
  dow: number;
  hour: number;
  reads: number;
}
export async function fetchReadingHeatmap(
  novelId: string | null,
  days = 30,
): Promise<HeatmapCell[]> {
  const { data, error } = await supabase.rpc("creator_reading_heatmap", {
    _novel_id: novelId ?? undefined,
    _days: days,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    dow: Number(r.dow),
    hour: Number(r.hour),
    reads: Number(r.reads),
  }));
}

export interface TopReader {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  is_vip: boolean;
  chapters_read: number;
  last_read_at: string;
}
export async function fetchTopReaders(
  novelId: string | null = null,
  limit = 10,
  days = 90,
): Promise<TopReader[]> {
  const { data, error } = await supabase.rpc("creator_top_readers", {
    _novel_id: novelId ?? undefined,
    _limit: limit,
    _days: days,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    user_id: r.user_id as string,
    username: (r.username as string | null) ?? null,
    display_name: (r.display_name as string | null) ?? null,
    avatar_url: (r.avatar_url as string | null) ?? null,
    is_vip: Boolean(r.is_vip),
    chapters_read: Number(r.chapters_read),
    last_read_at: String(r.last_read_at),
  }));
}

export interface TopCountry {
  country_code: string;
  readers: number;
  reads: number;
}
export async function fetchTopCountries(
  novelId: string | null = null,
  limit = 10,
  days = 90,
): Promise<TopCountry[]> {
  const { data, error } = await supabase.rpc("creator_top_countries", {
    _novel_id: novelId ?? undefined,
    _limit: limit,
    _days: days,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    country_code: String(r.country_code ?? "--"),
    readers: Number(r.readers),
    reads: Number(r.reads),
  }));
}

export interface ReadingSource {
  source: "free" | "vip" | "coin_unlock";
  reads: number;
}
export async function fetchReadingSources(
  novelId: string | null = null,
  days = 30,
): Promise<ReadingSource[]> {
  const { data, error } = await supabase.rpc("creator_reading_sources", {
    _novel_id: novelId ?? undefined,
    _days: days,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    source: r.source as ReadingSource["source"],
    reads: Number(r.reads),
  }));
}

export interface CompletionRate {
  novel_id: string;
  title: string;
  slug: string;
  total_readers: number;
  finished_readers: number;
  completion_pct: number;
  avg_progress: number;
}
export async function fetchCompletionRates(
  novelId: string | null = null,
): Promise<CompletionRate[]> {
  const { data, error } = await supabase.rpc("creator_completion_rates", { _novel_id: novelId ?? undefined });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    novel_id: r.novel_id as string,
    title: r.title as string,
    slug: r.slug as string,
    total_readers: Number(r.total_readers),
    finished_readers: Number(r.finished_readers),
    completion_pct: Number(r.completion_pct),
    avg_progress: Number(r.avg_progress),
  }));
}

export interface CalendarChapter {
  chapter_id: string;
  novel_id: string;
  novel_title: string;
  novel_slug: string;
  chapter_number: number;
  title: string;
  status: "draft" | "scheduled" | "published";
  scheduled_at: string | null;
  published_at: string | null;
  is_vip: boolean;
}
export async function fetchPublishingCalendar(
  daysBack = 30,
  daysForward = 30,
): Promise<CalendarChapter[]> {
  const { data, error } = await supabase.rpc("creator_publishing_calendar", {
    _days_back: daysBack,
    _days_forward: daysForward,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    chapter_id: r.chapter_id as string,
    novel_id: r.novel_id as string,
    novel_title: r.novel_title as string,
    novel_slug: r.novel_slug as string,
    chapter_number: Number(r.chapter_number),
    title: r.title as string,
    status: r.status as CalendarChapter["status"],
    scheduled_at: (r.scheduled_at as string | null) ?? null,
    published_at: (r.published_at as string | null) ?? null,
    is_vip: Boolean(r.is_vip),
  }));
}

export interface ChapterVersion {
  id: string;
  version_no: number;
  note: string | null;
  editor_id: string | null;
  editor_name: string | null;
  created_at: string;
  title_ar: string | null;
  title_en: string | null;
  content_len_ar: number;
  content_len_en: number;
}
export async function fetchChapterVersions(chapterId: string): Promise<ChapterVersion[]> {
  const { data, error } = await supabase.rpc("creator_chapter_versions", {
    _chapter_id: chapterId,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    id: r.id as string,
    version_no: Number(r.version_no),
    note: (r.note as string | null) ?? null,
    editor_id: (r.editor_id as string | null) ?? null,
    editor_name: (r.editor_name as string | null) ?? null,
    created_at: String(r.created_at),
    title_ar: (r.title_ar as string | null) ?? null,
    title_en: (r.title_en as string | null) ?? null,
    content_len_ar: Number(r.content_len_ar),
    content_len_en: Number(r.content_len_en),
  }));
}

export async function restoreChapterVersion(versionId: string): Promise<string> {
  const { data, error } = await supabase.rpc("creator_restore_chapter_version", {
    _version_id: versionId,
  });
  if (error) throw error;
  return data as unknown as string;
}
