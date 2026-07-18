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
export async function gmAward(code: string, refKey?: string, meta?: Record<string, unknown>): Promise<GmAwardResult | null> {
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

export async function gmLeaderboard(metric: "xp" | "coins" = "xp", period: "all_time" | "weekly" | "monthly" = "all_time", limit = 50): Promise<GmLeaderRow[]> {
  const { data } = await supabase.rpc("gm_leaderboard", { _metric: metric, _period: period, _limit: limit });
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

export function xpForNextLevel(level: number): number {
  return Math.pow(level + 1, 2) * 50;
}

export function levelProgress(totalXp: number, level: number): { needed: number; into: number; pct: number } {
  const floor = Math.pow(level, 2) * 50;
  const ceil = Math.pow(level + 1, 2) * 50;
  const into = Math.max(0, totalXp - floor);
  const needed = ceil - floor;
  const pct = Math.min(100, Math.round((into / needed) * 100));
  return { needed, into, pct };
}
