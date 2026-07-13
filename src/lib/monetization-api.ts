import { supabase } from "@/integrations/supabase/client";

// ============ WALLET / COIN ECONOMY ============
export async function fetchMyWallet() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { coins: 0 };
  // Ensure row exists (idempotent).
  await supabase.from("wallets").upsert({ user_id: u.user.id, coins: 0 }, { onConflict: "user_id", ignoreDuplicates: true });
  const { data } = await supabase.from("wallets").select("coins").eq("user_id", u.user.id).maybeSingle();
  return { coins: data?.coins ?? 0 };
}

export interface CoinTx {
  id: string; kind: string; amount: number; balance_after: number;
  ref_novel_id: string | null; ref_chapter_id: string | null; counterparty_id: string | null;
  note: string | null; created_at: string;
}
export async function fetchMyCoinHistory(limit = 50): Promise<CoinTx[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase.from("coin_transactions")
    .select("id,kind,amount,balance_after,ref_novel_id,ref_chapter_id,counterparty_id,note,created_at")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as CoinTx[];
}

// ============ CHAPTER UNLOCKS ============
export async function isChapterUnlocked(chapterId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase.from("chapter_unlocks")
    .select("id").eq("user_id", u.user.id).eq("chapter_id", chapterId).maybeSingle();
  return !!data;
}

export async function isCurrentUserVip(): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase.rpc("is_vip", { _user_id: u.user.id });
  return !!data;
}

export async function unlockChapter(chapterId: string) {
  const { data, error } = await supabase.rpc("unlock_chapter", { _chapter_id: chapterId });
  if (error) throw error;
  return data as { ok: boolean; balance?: number; already?: boolean };
}

export async function fetchMyUnlocks(limit = 100) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase.from("chapter_unlocks")
    .select("id,coins_spent,created_at,chapter:chapters(id,chapter_number,title,novel:novels(slug,title,cover_url))")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

// ============ COIN GIFTS ============
export async function giftCoinsToAuthor(input: { author_id: string; amount: number; novel_id?: string | null; message?: string | null }) {
  const { data, error } = await supabase.rpc("gift_coins", {
    _author_id: input.author_id,
    _amount: input.amount,
    _novel_id: input.novel_id ?? undefined,
    _message: input.message ?? undefined,
  });
  if (error) throw error;
  return data as { ok: boolean; balance?: number };
}

export async function fetchGiftsReceived(limit = 20) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("coin_gifts")
    .select("id,amount,message,created_at,novel:novels(title,slug),sender:profiles!coin_gifts_sender_id_fkey(username,display_name,avatar_url)")
    .eq("author_id", u.user.id).order("created_at", { ascending: false }).limit(limit);
  return data ?? [];
}

// ============ AUTHOR EARNINGS ============
export async function fetchMyAuthorEarnings() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { coins_total: 0, coins_pending: 0, coins_paid_out: 0 };
  const { data } = await supabase.from("author_earnings")
    .select("coins_total,coins_pending,coins_paid_out")
    .eq("author_id", u.user.id).maybeSingle();
  return data ?? { coins_total: 0, coins_pending: 0, coins_paid_out: 0 };
}

export async function fetchMyEarningsSeries(days = 30) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const since = new Date(Date.now() - days * 86400_000).toISOString();
  const { data } = await supabase.from("coin_transactions")
    .select("amount,kind,created_at")
    .eq("user_id", u.user.id)
    .in("kind", ["earn_unlock", "earn_gift"])
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  return (data ?? []) as { amount: number; kind: string; created_at: string }[];
}

// ============ STREAKS & GOALS ============
export async function fetchMyStreak() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from("reading_streaks")
    .select("current_streak,longest_streak,last_read_date")
    .eq("user_id", u.user.id).maybeSingle();
  return data ?? { current_streak: 0, longest_streak: 0, last_read_date: null };
}
export async function bumpMyStreak() {
  const { data, error } = await supabase.rpc("bump_reading_streak");
  if (error) throw error;
  return data as { ok: boolean; current?: number; longest?: number };
}

export async function fetchMyGoals() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from("reading_goals")
    .select("daily_chapters,weekly_chapters").eq("user_id", u.user.id).maybeSingle();
  return data ?? { daily_chapters: 1, weekly_chapters: 7 };
}
export async function upsertMyGoals(g: { daily_chapters: number; weekly_chapters: number }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  const { error } = await supabase.from("reading_goals").upsert({ user_id: u.user.id, ...g });
  if (error) throw error;
}

export async function fetchTodaysReadCount() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const { count } = await supabase.from("reading_history")
    .select("*", { count: "exact", head: true })
    .eq("user_id", u.user.id)
    .gte("last_read_at", today.toISOString());
  return count ?? 0;
}

// ============ HOMEPAGE SECTIONS ============
export interface HomepageSection {
  id: string; sort_order: number; title: string; subtitle: string | null;
  icon: string | null; algorithm: string; genre_slug: string | null;
  limit_count: number; enabled: boolean;
}
export async function fetchHomepageSections(all = false): Promise<HomepageSection[]> {
  let q = supabase.from("homepage_sections")
    .select("id,sort_order,title,subtitle,icon,algorithm,genre_slug,limit_count,enabled")
    .order("sort_order", { ascending: true });
  if (!all) q = q.eq("enabled", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as HomepageSection[];
}
export async function upsertHomepageSection(row: Partial<HomepageSection> & { id?: string }) {
  const { data, error } = await supabase.from("homepage_sections").upsert(row as never).select().maybeSingle();
  if (error) throw error;
  return data;
}
export async function deleteHomepageSection(id: string) {
  const { error } = await supabase.from("homepage_sections").delete().eq("id", id);
  if (error) throw error;
}

// ============ CMS ============
export interface StaticPage { id: string; slug: string; title: string; body_html: string; is_published: boolean; updated_at: string }
export async function fetchStaticPage(slug: string): Promise<StaticPage | null> {
  const { data } = await supabase.from("static_pages")
    .select("id,slug,title,body_html,is_published,updated_at").eq("slug", slug).maybeSingle();
  return (data as StaticPage | null) ?? null;
}
export async function fetchAllPages(): Promise<StaticPage[]> {
  const { data } = await supabase.from("static_pages")
    .select("id,slug,title,body_html,is_published,updated_at").order("slug");
  return (data ?? []) as StaticPage[];
}
export async function upsertStaticPage(p: Partial<StaticPage>) {
  const { error } = await supabase.from("static_pages").upsert(p as never);
  if (error) throw error;
}
export async function deleteStaticPage(id: string) {
  const { error } = await supabase.from("static_pages").delete().eq("id", id);
  if (error) throw error;
}

export interface Faq { id: string; question: string; answer: string; sort_order: number; enabled: boolean }
export async function fetchFaqs(all = false): Promise<Faq[]> {
  let q = supabase.from("faqs").select("id,question,answer,sort_order,enabled").order("sort_order");
  if (!all) q = q.eq("enabled", true);
  const { data } = await q;
  return (data ?? []) as Faq[];
}
export async function upsertFaq(f: Partial<Faq>) {
  const { error } = await supabase.from("faqs").upsert(f as never);
  if (error) throw error;
}
export async function deleteFaq(id: string) {
  const { error } = await supabase.from("faqs").delete().eq("id", id);
  if (error) throw error;
}

export interface Announcement {
  id: string; kind: string;
  title: string; body: string | null;
  title_ar?: string | null; title_en?: string | null;
  body_ar?: string | null; body_en?: string | null;
  link_url: string | null; starts_at: string | null; ends_at: string | null; enabled: boolean;
}
function currentUiLang(): "ar" | "en" {
  if (typeof window === "undefined") return "ar";
  try { return window.localStorage.getItem("urfav_lang") === "en" ? "en" : "ar"; } catch { return "ar"; }
}
function resolveAnnouncement(a: Announcement): Announcement {
  const lang = currentUiLang();
  const title = lang === "en" ? (a.title_en?.trim() || a.title_ar || a.title) : (a.title_ar?.trim() || a.title);
  const body  = lang === "en" ? (a.body_en?.trim()  || a.body_ar  || a.body ) : (a.body_ar?.trim()  || a.body );
  return { ...a, title, body };
}
export async function fetchAnnouncements(kind?: string): Promise<Announcement[]> {
  let q = supabase.from("announcements")
    .select("id,kind,title,title_ar,title_en,body,body_ar,body_en,link_url,starts_at,ends_at,enabled")
    .eq("enabled", true).order("created_at", { ascending: false });
  if (kind) q = q.eq("kind", kind);
  const { data } = await q;
  return ((data ?? []) as Announcement[]).filter((a) => {
    const now = Date.now();
    if (a.starts_at && new Date(a.starts_at).getTime() > now) return false;
    if (a.ends_at && new Date(a.ends_at).getTime() < now) return false;
    return true;
  }).map(resolveAnnouncement);
}
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data } = await supabase.from("announcements")
    .select("id,kind,title,title_ar,title_en,body,body_ar,body_en,link_url,starts_at,ends_at,enabled")
    .order("created_at", { ascending: false });
  return (data ?? []) as Announcement[];
}
export async function upsertAnnouncement(a: Partial<Announcement>) {
  const { error } = await supabase.from("announcements").upsert(a as never);
  if (error) throw error;
}
export async function deleteAnnouncement(id: string) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}

// ============ ADS ============
export interface AdRow { id: string; slot: string; kind: string; enabled: boolean; script_html: string | null; image_url: string | null; link_url: string | null; starts_at: string | null; ends_at: string | null; priority: number; frequency: number; target: Record<string, unknown> }
export async function fetchAllAds(): Promise<AdRow[]> {
  const { data } = await supabase.from("ad_placements")
    .select("id,slot,kind,enabled,script_html,image_url,link_url,starts_at,ends_at,priority,frequency,target")
    .order("slot").order("priority", { ascending: false });
  return (data ?? []) as unknown as AdRow[];
}
export async function upsertAd(a: Partial<AdRow>) {
  const { error } = await supabase.from("ad_placements").upsert(a as never);
  if (error) throw error;
}
export async function deleteAd(id: string) {
  const { error } = await supabase.from("ad_placements").delete().eq("id", id);
  if (error) throw error;
}
