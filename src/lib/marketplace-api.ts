import { supabase } from "@/integrations/supabase/client";

export type Rarity = "common" | "rare" | "epic" | "legendary";
export type MarketCategory =
  | "frame" | "animated_frame" | "theme" | "background"
  | "chat_color" | "username_color" | "badge" | "title"
  | "effect" | "box" | "vip";

export interface MarketCategoryRow {
  code: MarketCategory; label_ar: string; label_en: string | null;
  icon: string | null; sort_order: number; enabled: boolean; vip_only: boolean;
}

export interface MarketItem {
  id: string;
  code: string;
  category: MarketCategory;
  title_ar: string; title_en: string | null;
  description_ar: string | null; description_en: string | null;
  icon: string | null; image_url: string | null; animation_url: string | null;
  rarity: Rarity;
  price_coins: number;
  original_price_coins: number | null;
  duration_days: number | null;
  vip_only: boolean;
  stock: number | null; stock_sold: number;
  max_per_user: number | null;
  is_active: boolean;
  starts_at: string | null; ends_at: string | null;
  payload: Record<string, unknown>;
  sort_order: number;
}

export interface InventoryItem {
  id: string; category: MarketCategory; item_code: string | null;
  marketplace_item_id: string | null;
  source: string; acquired_at: string; expires_at: string | null;
  is_equipped: boolean;
  title_ar: string; title_en: string | null;
  rarity: Rarity; icon: string | null; image_url: string | null;
  meta: Record<string, unknown>;
}

export interface EquipmentSlot {
  slot: string; inventory_id: string | null; item_code: string | null; equipped_at: string;
}

export interface DailyShopItem {
  item_id: string; code: string; category: MarketCategory;
  title_ar: string; title_en: string | null;
  icon: string | null; image_url: string | null;
  rarity: Rarity; price_coins: number; discount_percent: number; ends_at: string;
}

export interface CoinHistoryRow {
  id: string; kind: string; amount: number; balance_after: number;
  note: string | null; created_at: string;
}

export interface PurchaseRow {
  id: string; item_id: string | null; title_ar: string;
  category: MarketCategory; price_coins: number; qty: number;
  status: string; created_at: string;
}

export interface EconomyDashboard {
  total_generated: number;
  total_spent: number;
  avg_user_coins: number;
  top_buyers: Array<{ user_id: string; spent: number; purchases: number }>;
  top_earners: Array<{ user_id: string; earned: number }>;
  most_purchased: Array<{ item_id: string; title_ar: string; purchases: number; revenue: number }>;
  most_equipped: Array<{ item_code: string; slot: string; n: number }>;
  daily_flow: Array<{ day: string; earned: number; spent: number }>;
}

export async function mkListCategories(): Promise<MarketCategoryRow[]> {
  const { data } = await supabase
    .from("marketplace_categories")
    .select("*")
    .eq("enabled", true)
    .order("sort_order");
  return (data ?? []) as MarketCategoryRow[];
}

export async function mkListItems(category?: MarketCategory): Promise<MarketItem[]> {
  let q = supabase.from("marketplace_items").select("*").eq("is_active", true).order("sort_order");
  if (category) q = q.eq("category", category);
  const { data } = await q;
  return (data ?? []) as MarketItem[];
}

export async function mkBuyItem(itemId: string, qty = 1) {
  const { data, error } = await supabase.rpc("mk_buy_item", { _item_id: itemId, _qty: qty });
  if (error) throw error;
  return data as { ok: boolean; error?: string; balance?: number; inventory_id?: string };
}

export async function mkMyInventory(): Promise<InventoryItem[]> {
  try {
    const { data } = await supabase.rpc("mk_my_inventory");
    return (data as InventoryItem[]) ?? [];
  } catch { return []; }
}

export async function mkMyEquipment(): Promise<EquipmentSlot[]> {
  try {
    const { data } = await supabase.rpc("mk_my_equipment");
    return (data as EquipmentSlot[]) ?? [];
  } catch { return []; }
}

export async function mkEquip(inventoryId: string) {
  const { data, error } = await supabase.rpc("mk_equip", { _inventory_id: inventoryId });
  if (error) throw error;
  return data as { ok: boolean; slot?: string; error?: string };
}

export async function mkUnequip(slot: string) {
  const { data, error } = await supabase.rpc("mk_unequip", { _slot: slot });
  if (error) throw error;
  return data as { ok: boolean };
}

export async function mkDailyShop(): Promise<DailyShopItem[]> {
  const { data } = await supabase.rpc("mk_daily_shop");
  return (data as DailyShopItem[]) ?? [];
}

export async function mkRotateDailyShop(count = 6): Promise<number> {
  const { data, error } = await supabase.rpc("mk_rotate_daily_shop", { _count: count });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function mkCoinHistory(limit = 50, before?: string): Promise<CoinHistoryRow[]> {
  const { data } = await supabase.rpc("mk_coin_history", { _limit: limit, _before: before ?? undefined });
  return (data as CoinHistoryRow[]) ?? [];
}

export async function mkPurchaseHistory(limit = 30, before?: string): Promise<PurchaseRow[]> {
  const { data } = await supabase.rpc("mk_purchase_history", { _limit: limit, _before: before ?? undefined });
  return (data as PurchaseRow[]) ?? [];
}

export async function mkAdminGrantItem(userId: string, itemId: string) {
  const { data, error } = await supabase.rpc("mk_admin_grant_item", { _user: userId, _item_id: itemId });
  if (error) throw error;
  return data;
}

export async function mkEconomyDashboard(days = 30): Promise<EconomyDashboard | null> {
  try {
    const { data } = await supabase.rpc("mk_economy_dashboard", { _days: days });
    return (data as unknown as EconomyDashboard) ?? null;
  } catch { return null; }
}

// Admin CRUD (RLS restricts writes via has_any_admin_role check on server; use service RPC or direct table if staff)
export async function mkAdminUpsertItem(item: Partial<MarketItem> & { id?: string }) {
  const { id, ...rest } = item;
  const payload = { ...rest, payload: (item.payload ?? {}) as never, updated_at: new Date().toISOString() } as never;
  if (id) {
    const { error } = await supabase.from("marketplace_items").update(payload).eq("id", id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("marketplace_items").insert(payload);
    if (error) throw error;
  }
}

export async function mkAdminDeleteItem(id: string) {
  const { error } = await supabase.from("marketplace_items").delete().eq("id", id);
  if (error) throw error;
}

export const RARITY_STYLES: Record<Rarity, { ring: string; text: string; label_ar: string; glow: string }> = {
  common:    { ring: "border-slate-500/40", text: "text-slate-300",   label_ar: "عادي",    glow: "" },
  rare:      { ring: "border-sky-400/60",   text: "text-sky-300",     label_ar: "نادر",    glow: "shadow-[0_0_20px_-4px_#38bdf8]" },
  epic:      { ring: "border-fuchsia-400/70", text: "text-fuchsia-300", label_ar: "ملحمي",  glow: "shadow-[0_0_24px_-4px_#e879f9]" },
  legendary: { ring: "border-amber-400/80", text: "text-amber-300",   label_ar: "أسطوري", glow: "shadow-[0_0_30px_-2px_#fbbf24]" },
};

export const CATEGORY_LABELS_AR: Record<MarketCategory, string> = {
  frame: "إطارات",
  animated_frame: "إطارات متحركة",
  theme: "ثيمات",
  background: "خلفيات",
  chat_color: "ألوان الدردشة",
  username_color: "ألوان الاسم",
  badge: "شارات",
  title: "ألقاب",
  effect: "تأثيرات القراءة",
  box: "صناديق غامضة",
  vip: "عضوية VIP",
};
