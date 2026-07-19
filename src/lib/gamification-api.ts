import { supabase } from "@/integrations/supabase/client";

export interface GmProfile {
  xp: number;
  total_xp: number;
  level: number;
  coins: number;
  streak_current: number;
  streak_longest: number;
  badges: Array<{ code: string; awarded_at: string; is_equipped: boolean }>;
  achievements: Array<{ code: string; unlocked_at: string }>;
  unopened_boxes: number;
}

export interface GmMission {
  code: string;
  title_ar: string;
  title_en: string | null;
  target_kind: string;
  target_value: number;
  xp: number;
  coins: number;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface GmAwardResult {
  ok: boolean;
  xp?: number;
  coins?: number;
  total_xp?: number;
  level?: number;
  leveled_up?: boolean;
  skipped?: string;
  error?: string;
}

export interface GmLeaderRow {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  score: number;
  rank: number;
}

/** Award XP/coins. Silent on failure (gamification must never break user flow). */
export async function gmAward(
  code: string,
  refKey?: string,
  meta?: Record<string, unknown>,
): Promise<GmAwardResult | null> {
  try {
    const { data } = await supabase.rpc("gm_award", {
      _code: code,
      _ref_key: refKey ?? undefined,
      _meta: (meta ?? {}) as never,
    });
    return (data as unknown as GmAwardResult) ?? null;
  } catch {
    return null;
  }
}

export async function gmMyProfile(): Promise<GmProfile | null> {
  try {
    const { data } = await supabase.rpc("gm_my_profile");
    return (data as unknown as GmProfile) ?? null;
  } catch {
    return null;
  }
}

export async function gmMyMissions(): Promise<GmMission[]> {
  try {
    const { data } = await supabase.rpc("gm_my_missions");
    return (data as GmMission[]) ?? [];
  } catch {
    return [];
  }
}

export async function gmClaimMission(code: string) {
  const { data, error } = await supabase.rpc("gm_claim_mission", { _code: code });
  if (error) throw error;
  return data;
}

export async function gmClaimChallenge(id: string) {
  const { data, error } = await supabase.rpc("gm_claim_challenge", { _id: id });
  if (error) throw error;
  return data;
}

export async function gmLeaderboard(
  metric: "xp" | "coins" = "xp",
  period: "all_time" | "weekly" | "monthly" = "all_time",
  limit = 50,
): Promise<GmLeaderRow[]> {
  const { data } = await supabase.rpc("gm_leaderboard", {
    _metric: metric,
    _period: period,
    _limit: limit,
  });
  return (data as GmLeaderRow[]) ?? [];
}

export async function gmGetReferralCode(): Promise<string | null> {
  try {
    const { data } = await supabase.rpc("gm_get_or_create_referral_code");
    return (data as string) ?? null;
  } catch {
    return null;
  }
}

export async function gmUseReferral(code: string) {
  const { data, error } = await supabase.rpc("gm_use_referral", { _code: code });
  if (error) throw error;
  return data;
}

export async function gmOpenBox(id: string) {
  const { data, error } = await supabase.rpc("gm_open_box", { _id: id });
  if (error) throw error;
  return data as { ok: boolean; reward: Record<string, unknown> };
}

export async function gmMyBoxes() {
  const { data } = await supabase
    .from("reward_boxes")
    .select("id, source, opened, reward, created_at, opened_at")
    .order("created_at", { ascending: false })
    .limit(20);
  return data ?? [];
}

export async function gmListBadges() {
  const { data } = await supabase.from("badges").select("*").order("sort_order");
  return data ?? [];
}

export async function gmListAchievements() {
  const { data } = await supabase.from("achievements").select("*").order("sort_order");
  return data ?? [];
}

// ---------- Phase 2 additions ----------

export interface GmReadingStats {
  total_chapters_read: number;
  total_minutes: number;
  words_read: number;
  sessions_count: number;
  longest_session_min: number;
  completed_novels: number;
  novels_read: number;
  current_streak: number;
  longest_streak: number;
  calendar: Array<{ day: string; count: number }>;
  monthly: Array<{ month: string; count: number }>;
  favorite_novel: { id: string; slug: string; title: string; cover_url: string | null } | null;
  favorite_author: string | null;
  favorite_genre: { id: string; name: string } | null;
}

export interface GmAchievementProgress {
  code: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  category: string;
  rarity: string;
  hidden: boolean;
  xp: number;
  coins: number;
  badge_code: string | null;
  threshold_kind: string;
  threshold_value: number;
  progress: number;
  unlocked: boolean;
  unlocked_at: string | null;
}

export async function gmReadingStats(): Promise<GmReadingStats | null> {
  try {
    const { data } = await supabase.rpc("gm_reading_stats");
    return (data as unknown as GmReadingStats) ?? null;
  } catch {
    return null;
  }
}

export async function gmAchievementProgress(): Promise<GmAchievementProgress[]> {
  try {
    const { data } = await supabase.rpc("gm_achievement_progress");
    return (data as unknown as GmAchievementProgress[]) ?? [];
  } catch {
    return [];
  }
}

export async function gmAdminGrantBadge(userId: string, code: string) {
  const { error } = await supabase.rpc("gm_admin_grant_badge", { _user: userId, _code: code });
  if (error) throw error;
}

export async function gmAdminGrantAchievement(userId: string, code: string) {
  const { error } = await supabase.rpc("gm_admin_grant_achievement", {
    _user: userId,
    _code: code,
  });
  if (error) throw error;
}

export function xpForNextLevel(level: number): number {
  return Math.pow(level + 1, 2) * 50;
}

export function levelProgress(
  totalXp: number,
  level: number,
): { needed: number; into: number; pct: number } {
  const floor = Math.pow(level, 2) * 50;
  const ceil = Math.pow(level + 1, 2) * 50;
  const into = Math.max(0, totalXp - floor);
  const needed = ceil - floor;
  const pct = Math.min(100, Math.round((into / needed) * 100));
  return { needed, into, pct };
}

export const RARITY_STYLES: Record<
  string,
  { ring: string; text: string; glow: string; label_ar: string }
> = {
  common: {
    ring: "border-slate-400/40",
    text: "text-slate-300",
    glow: "shadow-none",
    label_ar: "عادي",
  },
  rare: {
    ring: "border-sky-400/50",
    text: "text-sky-300",
    glow: "shadow-[0_0_20px_-4px_#38bdf8]",
    label_ar: "نادر",
  },
  epic: {
    ring: "border-fuchsia-400/60",
    text: "text-fuchsia-300",
    glow: "shadow-[0_0_24px_-4px_#e879f9]",
    label_ar: "ملحمي",
  },
  legendary: {
    ring: "border-amber-400/70",
    text: "text-amber-300",
    glow: "shadow-[0_0_30px_-2px_#fbbf24]",
    label_ar: "أسطوري",
  },
};

export const CATEGORY_LABELS_AR: Record<string, string> = {
  reading: "القراءة",
  community: "المجتمع",
  author: "الكتّاب",
  social: "التواصل",
  vip: "VIP",
  events: "الفعاليات",
};

// ---------- Phase 3 additions ----------

export interface GmChallenge {
  id: string;
  title_ar: string;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  icon: string | null;
  difficulty: string;
  category: string;
  target_kind: string;
  target_value: number;
  xp: number;
  coins: number;
  starts_at: string;
  ends_at: string;
  progress: number;
  completed: boolean;
  claimed: boolean;
}

export interface GmActivityItem {
  id: string;
  actor_id: string;
  actor_username: string | null;
  actor_display_name: string | null;
  actor_avatar_url: string | null;
  kind: string;
  ref_novel_id: string | null;
  ref_chapter_id: string | null;
  ref_user_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface GmRank {
  tier: "bronze" | "silver" | "gold" | "diamond" | "master" | "legend" | "immortal";
  tier_ar: string;
  score: number;
  xp: number;
  achievements: number;
  chapters: number;
  next_tier: string | null;
  next_at: number;
}

export async function gmMyChallenges(): Promise<GmChallenge[]> {
  try {
    const { data } = await supabase.rpc("gm_my_challenges");
    return (data as GmChallenge[]) ?? [];
  } catch {
    return [];
  }
}

export async function gmActivityFeed(limit = 30, before?: string): Promise<GmActivityItem[]> {
  try {
    const { data } = await supabase.rpc("gm_activity_feed", {
      _limit: limit,
      _before: before ?? undefined,
    });
    return (data as GmActivityItem[]) ?? [];
  } catch {
    return [];
  }
}

export async function gmUserRank(userId?: string): Promise<GmRank | null> {
  try {
    const { data } = await supabase.rpc("gm_user_rank", { _user: userId ?? undefined });
    return (data as unknown as GmRank) ?? null;
  } catch {
    return null;
  }
}

export const RANK_STYLES: Record<
  GmRank["tier"],
  { label_ar: string; ring: string; text: string; bg: string; icon: string }
> = {
  bronze: {
    label_ar: "برونزي",
    ring: "border-amber-700/60",
    text: "text-amber-600",
    bg: "bg-amber-950/40",
    icon: "🥉",
  },
  silver: {
    label_ar: "فضّي",
    ring: "border-slate-300/60",
    text: "text-slate-200",
    bg: "bg-slate-800/60",
    icon: "🥈",
  },
  gold: {
    label_ar: "ذهبي",
    ring: "border-yellow-400/70",
    text: "text-yellow-300",
    bg: "bg-yellow-950/40",
    icon: "🥇",
  },
  diamond: {
    label_ar: "ماسي",
    ring: "border-cyan-400/70",
    text: "text-cyan-300",
    bg: "bg-cyan-950/40",
    icon: "💎",
  },
  master: {
    label_ar: "محترف",
    ring: "border-fuchsia-400/70",
    text: "text-fuchsia-300",
    bg: "bg-fuchsia-950/40",
    icon: "🏆",
  },
  legend: {
    label_ar: "أسطورة",
    ring: "border-orange-400/80",
    text: "text-orange-300",
    bg: "bg-orange-950/40",
    icon: "🔥",
  },
  immortal: {
    label_ar: "خالد",
    ring: "border-rose-400/80",
    text: "text-rose-300",
    bg: "bg-rose-950/50",
    icon: "👑",
  },
};

export const DIFFICULTY_LABELS_AR: Record<string, string> = {
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
  extreme: "أسطوري",
};

export const LEADERBOARD_METRICS: Array<{ code: string; label_ar: string; icon: string }> = [
  { code: "xp", label_ar: "XP", icon: "✨" },
  { code: "coins", label_ar: "العملات", icon: "🪙" },
  { code: "chapters", label_ar: "فصول مقروءة", icon: "📖" },
  { code: "minutes", label_ar: "دقائق قراءة", icon: "⏱️" },
  { code: "completed", label_ar: "روايات مكتملة", icon: "🏁" },
  { code: "achievements", label_ar: "الإنجازات", icon: "🏅" },
  { code: "streak", label_ar: "أطول سلسلة", icon: "🔥" },
];

// ---------- Phase 3 Mission Engine ----------

export interface GmMissionAnalytics {
  daily_active: number;
  weekly_active: number;
  completion_rate: number;
  avg_completion_minutes: number | null;
  per_mission: Array<{
    code: string;
    title_ar: string;
    difficulty: string | null;
    category: string | null;
    started: number;
    completed: number;
    claimed: number;
    completion_rate: number;
  }> | null;
  timeseries: Array<{ day: string; completed: number; started: number }> | null;
}

export async function gmMissionAnalytics(days = 30): Promise<GmMissionAnalytics | null> {
  try {
    const { data } = await supabase.rpc("gm_mission_analytics", { _days: days });
    return (data as unknown as GmMissionAnalytics) ?? null;
  } catch {
    return null;
  }
}

export async function gmGenerateMissions(
  difficulty: "easy" | "medium" | "hard" | "legendary",
  count = 3,
): Promise<number> {
  const { data, error } = await supabase.rpc("gm_generate_missions", {
    _difficulty: difficulty,
    _count: count,
  });
  if (error) throw error;
  return (data as number) ?? 0;
}
