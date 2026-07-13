import { supabase } from "@/integrations/supabase/client";

// ============ Push notifications ============
export async function subscribePush(): Promise<{ ok: boolean; error?: string }> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { ok: false, error: "unsupported" };
  }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== "granted") return { ok: false, error: "denied" };
    const reg = await navigator.serviceWorker.register("/sw.js");
    // Use a placeholder key; real VAPID key would go in settings. For now register as no-op if unavailable.
    const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: undefined });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !sub) return { ok: false, error: "no-user" };
    const raw = sub.toJSON() as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
    if (!raw.endpoint || !raw.keys?.p256dh || !raw.keys.auth) return { ok: false, error: "invalid" };
    await supabase.from("push_subscriptions").upsert({
      user_id: u.user.id,
      endpoint: raw.endpoint,
      p256dh: raw.keys.p256dh,
      auth_key: raw.keys.auth,
      user_agent: navigator.userAgent,
    }, { onConflict: "user_id,endpoint" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

// ============ Email templates ============
export interface EmailTemplate {
  id: string; code: string; name: string;
  subject_ar: string; subject_en: string | null;
  body_ar: string; body_en: string | null;
  variables: string[]; is_active: boolean;
}
export async function fetchEmailTemplates() {
  const { data, error } = await supabase.from("email_templates").select("*").order("code");
  if (error) throw error;
  return (data ?? []) as unknown as EmailTemplate[];
}
export async function upsertEmailTemplate(t: Partial<EmailTemplate> & { code: string; name: string; subject_ar: string; body_ar: string }) {
  const { error } = await supabase.from("email_templates").upsert(t, { onConflict: "code" });
  if (error) throw error;
}
export async function deleteEmailTemplate(id: string) {
  const { error } = await supabase.from("email_templates").delete().eq("id", id);
  if (error) throw error;
}

// ============ Feedback ============
export async function submitFeedback(input: { rating: number; category?: string; message?: string }) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from("reader_feedback").insert({
    user_id: u.user?.id ?? null,
    rating: input.rating,
    category: input.category ?? "general",
    message: input.message?.slice(0, 2000) ?? null,
    page_url: typeof window !== "undefined" ? window.location.href : null,
  });
  if (error) throw error;
}
export async function fetchFeedback() {
  const { data, error } = await supabase.from("reader_feedback").select("*").order("created_at", { ascending: false }).limit(200);
  if (error) throw error;
  return data ?? [];
}

// ============ Chapter reactions ============
export const CHAPTER_EMOJIS = ["❤️", "🔥", "😢", "😱", "😂", "🤯"] as const;
export async function fetchChapterReactionCounts(chapterId: string) {
  const { data } = await supabase.from("chapter_reactions").select("emoji").eq("chapter_id", chapterId);
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { emoji: string }[]) counts[r.emoji] = (counts[r.emoji] ?? 0) + 1;
  return counts;
}
export async function fetchMyChapterReactions(chapterId: string): Promise<Set<string>> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return new Set();
  const { data } = await supabase.from("chapter_reactions").select("emoji").eq("chapter_id", chapterId).eq("user_id", u.user.id);
  return new Set(((data ?? []) as { emoji: string }[]).map(r => r.emoji));
}
export async function toggleChapterReaction(chapterId: string, emoji: string, on: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  if (on) {
    const { error } = await supabase.from("chapter_reactions").insert({ user_id: u.user.id, chapter_id: chapterId, emoji });
    if (error && !error.message.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase.from("chapter_reactions").delete().eq("user_id", u.user.id).eq("chapter_id", chapterId).eq("emoji", emoji);
    if (error) throw error;
  }
}

// ============ System health / logs ============
export async function fetchSystemHealth() {
  const { data, error } = await supabase.rpc("admin_system_health");
  if (error) throw error;
  return data as Record<string, unknown>;
}
export async function fetchSystemLogs(limit = 200) {
  const { data, error } = await supabase.from("system_logs").select("*").order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}
export async function logSystemEvent(input: { level?: string; source?: string; message: string; context?: Record<string, unknown> }) {
  try {
    await supabase.from("system_logs").insert({
      level: input.level ?? "error",
      source: input.source ?? "client",
      message: input.message.slice(0, 2000),
      context: input.context ?? {},
    });
  } catch { /* swallow */ }
}

// ============ Storage manager ============
export async function fetchStorageStats() {
  const { data, error } = await supabase.rpc("admin_storage_stats");
  if (error) throw error;
  return (data ?? []) as { bucket_id: string; files: number; total_bytes: number }[];
}

// ============ Rate limiting ============
export async function checkRateLimit(action: string, limit: number, windowSecs = 60): Promise<boolean> {
  const { data, error } = await supabase.rpc("check_rate_limit", { _action: action, _limit: limit, _window_secs: windowSecs });
  if (error) return true; // fail-open (avoid blocking on outage)
  return data as boolean;
}

// ============ Spam protection ============
let spamCache: string[] | null = null;
export async function loadSpamWords(): Promise<string[]> {
  if (spamCache) return spamCache;
  const { data } = await supabase.from("spam_words").select("word");
  spamCache = ((data ?? []) as { word: string }[]).map(r => r.word.toLowerCase());
  return spamCache;
}
export async function containsSpam(text: string): Promise<boolean> {
  const words = await loadSpamWords();
  const lower = text.toLowerCase();
  return words.some(w => w && lower.includes(w));
}
export async function addSpamWord(word: string, severity = 1) {
  spamCache = null;
  const { error } = await supabase.from("spam_words").insert({ word: word.toLowerCase().trim(), severity });
  if (error) throw error;
}
export async function removeSpamWord(id: string) {
  spamCache = null;
  const { error } = await supabase.from("spam_words").delete().eq("id", id);
  if (error) throw error;
}
export async function fetchSpamWords() {
  const { data } = await supabase.from("spam_words").select("*").order("word");
  return (data ?? []) as { id: string; word: string; severity: number }[];
}

// ============ SEO overrides ============
export interface SeoOverride {
  id: string; path: string;
  title_ar: string | null; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  og_image: string | null; robots: string | null;
}
export async function fetchSeoOverrides() {
  const { data, error } = await supabase.from("seo_overrides").select("*").order("path");
  if (error) throw error;
  return (data ?? []) as unknown as SeoOverride[];
}
export async function upsertSeo(s: Partial<SeoOverride> & { path: string }) {
  const { error } = await supabase.from("seo_overrides").upsert(s, { onConflict: "path" });
  if (error) throw error;
}
export async function deleteSeo(id: string) {
  const { error } = await supabase.from("seo_overrides").delete().eq("id", id);
  if (error) throw error;
}

// ============ Import / Export ============
export async function exportTable(entity: "novels" | "chapters" | "profiles" | "genres" | "comments"): Promise<string> {
  const { data, error } = await supabase.from(entity).select("*").limit(10000);
  if (error) throw error;
  const rows = data ?? [];
  const json = JSON.stringify(rows, null, 2);
  await supabase.from("io_jobs").insert({
    actor_id: (await supabase.auth.getUser()).data.user?.id,
    kind: "export", entity, status: "success", rows: rows.length,
  });
  return json;
}
export async function fetchIoJobs() {
  const { data } = await supabase.from("io_jobs").select("*").order("created_at", { ascending: false }).limit(100);
  return data ?? [];
}

// ============ Cron registry ============
export async function fetchCronJobs() {
  const { data, error } = await supabase.from("cron_registry").select("*").order("code");
  if (error) throw error;
  return data ?? [];
}
export async function toggleCron(id: string, is_enabled: boolean) {
  const { error } = await supabase.from("cron_registry").update({ is_enabled }).eq("id", id);
  if (error) throw error;
}
