import { supabase } from "@/integrations/supabase/client";

// ============ COIN PACKAGES ============
export interface CoinPackage {
  id: string;
  code: string;
  coins: number;
  bonus_coins: number;
  price_usd_cents: number | null;
  price_egp_cents: number | null;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
}

export async function fetchCoinPackages(all = false): Promise<CoinPackage[]> {
  let q = supabase.from("coin_packages")
    .select("id,code,coins,bonus_coins,price_usd_cents,price_egp_cents,is_popular,is_active,sort_order")
    .order("sort_order", { ascending: true });
  if (!all) q = q.eq("is_active", true);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as CoinPackage[];
}

export async function upsertCoinPackage(p: Partial<CoinPackage> & { code: string; coins: number }) {
  const { error } = await supabase.from("coin_packages").upsert(p as never);
  if (error) throw error;
}

export async function deleteCoinPackage(id: string) {
  const { error } = await supabase.from("coin_packages").delete().eq("id", id);
  if (error) throw error;
}

// ============ VIP PLANS (admin) ============
export interface VipPlanAdmin {
  id: string; code: string; name_ar: string; name_en: string | null;
  description_ar: string | null;
  price_cents: number;
  price_usd_cents: number | null;
  price_egp_cents: number | null;
  currency: string;
  duration_days: number;
  features: string[];
  is_active: boolean;
  is_recommended: boolean;
  discount_percent: number;
  sort_order: number;
}

export async function fetchAllVipPlans(): Promise<VipPlanAdmin[]> {
  const { data, error } = await supabase.from("vip_plans").select("*").order("sort_order");
  if (error) throw error;
  return (data ?? []) as unknown as VipPlanAdmin[];
}

export async function upsertVipPlan(p: Partial<VipPlanAdmin> & { code: string; name_ar: string; duration_days: number }) {
  const { error } = await supabase.from("vip_plans").upsert(p as never);
  if (error) throw error;
}

export async function deleteVipPlan(id: string) {
  const { error } = await supabase.from("vip_plans").delete().eq("id", id);
  if (error) throw error;
}

// ============ CURRENCY / EXCHANGE RATE ============
export interface CurrencySettings { egp_per_usd: number }

export async function fetchCurrencySettings(): Promise<CurrencySettings> {
  const { data } = await supabase.from("site_settings").select("value").eq("key", "currency").maybeSingle();
  const v = (data?.value ?? {}) as Record<string, unknown>;
  const rate = Number(v.egp_per_usd);
  return { egp_per_usd: Number.isFinite(rate) && rate > 0 ? rate : 50 };
}

export async function updateCurrencySettings(s: CurrencySettings) {
  const { error } = await supabase.from("site_settings").upsert({ key: "currency", value: s as never });
  if (error) throw error;
}

// ============ Helpers ============
export function formatMoney(cents: number | null | undefined, currency: "USD" | "EGP"): string {
  const n = (cents ?? 0) / 100;
  if (currency === "USD") return `$${n.toFixed(2)}`;
  return `${n.toLocaleString("ar-EG", { maximumFractionDigits: 2 })} ج.م`;
}

/** Pick a package price in the target currency, falling back via exchange rate. */
export function priceInCurrency(
  pkg: { price_usd_cents: number | null; price_egp_cents: number | null },
  currency: "USD" | "EGP",
  egpPerUsd: number,
): number {
  if (currency === "USD") {
    if (pkg.price_usd_cents != null) return pkg.price_usd_cents;
    if (pkg.price_egp_cents != null) return Math.round(pkg.price_egp_cents / egpPerUsd);
    return 0;
  }
  if (pkg.price_egp_cents != null) return pkg.price_egp_cents;
  if (pkg.price_usd_cents != null) return Math.round(pkg.price_usd_cents * egpPerUsd);
  return 0;
}
