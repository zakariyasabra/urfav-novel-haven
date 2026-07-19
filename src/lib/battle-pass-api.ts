// Battle Pass — client API contract.
// Reuses the existing mission/challenge engine; nothing to duplicate on the client.

import { supabase } from "@/integrations/supabase/client";

export interface BpActiveSeason {
  id: string;
  slug: string | null;
  title_ar: string | null;
  title_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_url: string | null;
  starts_at: string;
  ends_at: string;
  max_tier: number;
  xp_per_tier: number;
  premium_price_coins: number;
}

export interface BpTier {
  id: string;
  season_id: string;
  tier: number;
  xp_required: number;
  free_reward: Record<string, unknown>;
  premium_reward: Record<string, unknown>;
}

export interface BpProgress {
  season_id: string;
  xp: number;
  tier: number;
  claimed_tiers: number[];
  has_premium: boolean;
}

export async function getActiveSeason(): Promise<BpActiveSeason | null> {
  const { data, error } = await supabase.rpc("bp_active_season");
  if (error) throw error;
  const row = (data as BpActiveSeason[])?.[0];
  return row ?? null;
}

export async function listTiers(seasonId: string): Promise<BpTier[]> {
  const { data, error } = await supabase
    .from("battle_pass_tiers")
    .select("*")
    .eq("season_id", seasonId)
    .order("tier", { ascending: true });
  if (error) throw error;
  return (data ?? []) as BpTier[];
}

export async function getMyProgress(seasonId: string): Promise<BpProgress | null> {
  const { data, error } = await supabase.rpc("bp_my_progress", { _season_id: seasonId });
  if (error) throw error;
  const row = (data as BpProgress[])?.[0];
  return row ?? null;
}

export async function purchasePremium(seasonId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("bp_purchase_premium", { _season_id: seasonId });
  if (error) throw error;
  return Boolean(data);
}

export async function claimTier(seasonId: string, tier: number): Promise<Record<string, unknown>> {
  const { data, error } = await supabase.rpc("bp_claim_tier", {
    _season_id: seasonId,
    _tier: tier,
  });
  if (error) throw error;
  return (data as Record<string, unknown>) ?? {};
}

// Admin
export async function adminGrantPremium(
  userId: string,
  seasonId: string,
  source: "grant" | "gift" | "promo" = "grant",
) {
  const { error } = await supabase.rpc("bp_admin_grant_premium", {
    _user_id: userId,
    _season_id: seasonId,
    _source: source,
  });
  if (error) throw error;
}
