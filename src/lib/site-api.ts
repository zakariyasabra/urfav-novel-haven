import { supabase } from "@/integrations/supabase/client";

export interface AdPlacement {
  slot: string;
  label_ar: string;
  enabled: boolean;
  script_html: string | null;
}
export interface VipPlan {
  id: string;
  code: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  price_cents: number;
  price_usd_cents: number | null;
  price_egp_cents: number | null;
  currency: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
  sort_order: number;
  is_recommended: boolean;
  discount_percent: number;
}
export interface SiteSetting {
  key: string;
  value: Record<string, unknown>;
}

export async function fetchAdPlacements(): Promise<AdPlacement[]> {
  const { data } = await supabase.from("ad_placements").select("slot,label_ar,enabled,script_html");
  return (data ?? []) as unknown as AdPlacement[];
}

export async function fetchVipPlans(): Promise<VipPlan[]> {
  const { data } = await supabase
    .from("vip_plans")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []) as unknown as VipPlan[];
}

export async function fetchSiteSettings(): Promise<Record<string, Record<string, unknown>>> {
  const { data } = await supabase.from("site_settings").select("key,value");
  const out: Record<string, Record<string, unknown>> = {};
  for (const row of (data ?? []) as { key: string; value: Record<string, unknown> }[])
    out[row.key] = row.value;
  return out;
}

export async function submitReport(payload: {
  type: "contact" | "dmca" | "abuse" | "bug" | "comment";
  reporter_email?: string;
  reporter_name?: string;
  subject?: string;
  content: string;
  target_url?: string;
  target_id?: string;
}) {
  const { error } = await supabase.from("reports").insert(payload);
  if (error) throw error;
}
