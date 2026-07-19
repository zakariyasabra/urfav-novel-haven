// Feature Flags — Phase 7
// Central client for reading Phase 7 feature toggles from site_settings.
// All flags default to OFF except: premium_chapters, ai_features, notification_center.
// Reads are cached for 60s to avoid hammering the DB.

import { supabase } from "@/integrations/supabase/client";

export type FeatureFlagKey =
  | "battle_pass"
  | "payments"
  | "premium_chapters"
  | "premium_rental"
  | "premium_purchase"
  | "reading_clubs"
  | "club_realtime_chat"
  | "ai_features"
  | "recommendations_v2"
  | "messaging"
  | "creator_studio"
  | "notification_center"
  | "author_donations"
  | "global_search_v2";

interface FlagRow {
  key: string;
  value: { enabled?: boolean; label?: string } | null;
}

const CACHE_TTL_MS = 60_000;
let cache: { at: number; flags: Record<string, boolean> } | null = null;
let inflight: Promise<Record<string, boolean>> | null = null;

async function loadAllFlags(): Promise<Record<string, boolean>> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.flags;
  if (inflight) return inflight;

  inflight = (async () => {
    const { data } = await supabase
      .from("site_settings")
      .select("key,value")
      .like("key", "feature_flag:%");

    const flags: Record<string, boolean> = {};
    for (const row of (data ?? []) as FlagRow[]) {
      const flagKey = row.key.replace(/^feature_flag:/, "");
      flags[flagKey] = Boolean(row.value?.enabled);
    }
    cache = { at: Date.now(), flags };
    inflight = null;
    return flags;
  })();

  return inflight;
}

export async function isFeatureEnabled(flag: FeatureFlagKey): Promise<boolean> {
  const flags = await loadAllFlags();
  return flags[flag] ?? false;
}

export async function getAllFeatureFlags(): Promise<Record<FeatureFlagKey, boolean>> {
  const flags = await loadAllFlags();
  return flags as Record<FeatureFlagKey, boolean>;
}

/** Invalidate the local cache (call after admin toggles a flag). */
export function invalidateFeatureFlagsCache() {
  cache = null;
}
