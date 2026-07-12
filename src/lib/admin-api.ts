import { supabase } from "@/integrations/supabase/client";

// ============ USERS ============
export interface AdminUserRow {
  id: string; username: string; display_name: string | null; avatar_url: string | null;
  is_vip: boolean; vip_expires_at: string | null; account_status: string;
  status_reason: string | null; suspended_until: string | null; created_at: string;
  roles: string[]; coins: number;
}

export async function fetchAdminUsers(search = "", limit = 100): Promise<AdminUserRow[]> {
  let q = supabase.from("profiles")
    .select("id,username,display_name,avatar_url,is_vip,vip_expires_at,account_status,status_reason,suspended_until,created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (search) q = q.or(`username.ilike.%${search.replace(/[%_,]/g,"")}%,display_name.ilike.%${search.replace(/[%_,]/g,"")}%`);
  const { data } = await q;
  const rows = (data ?? []) as Omit<AdminUserRow, "roles" | "coins">[];
  if (rows.length === 0) return [];
  const ids = rows.map(r => r.id);
  const [{ data: rolesData }, { data: walletData }] = await Promise.all([
    supabase.from("user_roles").select("user_id,role").in("user_id", ids),
    supabase.from("wallets").select("user_id,coins").in("user_id", ids),
  ]);
  const rolesByUser: Record<string,string[]> = {};
  for (const r of (rolesData ?? []) as { user_id: string; role: string }[]) (rolesByUser[r.user_id] ??= []).push(r.role);
  const coinsByUser: Record<string,number> = {};
  for (const w of (walletData ?? []) as { user_id: string; coins: number }[]) coinsByUser[w.user_id] = w.coins;
  return rows.map(r => ({ ...r, roles: rolesByUser[r.id] ?? [], coins: coinsByUser[r.id] ?? 0 }));
}

export async function adminAdjustCoins(userId: string, delta: number, note?: string) {
  const { error } = await supabase.rpc("admin_adjust_coins", { _user_id: userId, _delta: delta, _note: note ?? undefined });
  if (error) throw error;
}
export async function adminGrantRole(userId: string, role: "admin"|"moderator"|"editor"|"author"|"user") {
  const { error } = await supabase.rpc("admin_grant_role", { _user_id: userId, _role: role });
  if (error) throw error;
}
export async function adminRevokeRole(userId: string, role: "admin"|"moderator"|"editor"|"author"|"user") {
  const { error } = await supabase.rpc("admin_revoke_role", { _user_id: userId, _role: role });
  if (error) throw error;
}
export async function adminSetAccountStatus(userId: string, status: "active"|"suspended"|"banned", reason?: string, until?: string) {
  const { error } = await supabase.rpc("admin_set_account_status", { _user_id: userId, _status: status, _reason: reason ?? undefined, _until: until ?? undefined });
  if (error) throw error;
}
export async function adminGrantVip(userId: string, days: number) {
  const { error } = await supabase.rpc("admin_grant_vip", { _user_id: userId, _days: days });
  if (error) throw error;
}
export async function adminRevokeVip(userId: string) {
  const { error } = await supabase.rpc("admin_revoke_vip", { _user_id: userId });
  if (error) throw error;
}

// ============ AUDIT LOGS ============
export interface AuditLog {
  id: string; actor_id: string | null; action: string; target_type: string | null;
  target_id: string | null; metadata: Record<string, unknown>; created_at: string;
  actor?: { username: string } | null;
}
export async function fetchAuditLogs(limit = 100): Promise<AuditLog[]> {
  const { data } = await supabase.from("audit_logs")
    .select("id,actor_id,action,target_type,target_id,metadata,created_at,actor:profiles!audit_logs_actor_id_fkey(username)")
    .order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as unknown as AuditLog[];
}

// ============ PAYMENT METHODS ============
export interface PaymentMethod { id: string; code: string; name_ar: string; kind: string; instructions: string | null; account_details: string | null; enabled: boolean; sort_order: number }
export async function fetchPaymentMethods(all = false): Promise<PaymentMethod[]> {
  let q = supabase.from("payment_methods").select("*").order("sort_order");
  if (!all) q = q.eq("enabled", true);
  const { data } = await q;
  return (data ?? []) as PaymentMethod[];
}
export async function upsertPaymentMethod(m: Partial<PaymentMethod>) {
  const { error } = await supabase.from("payment_methods").upsert(m as never);
  if (error) throw error;
}
export async function deletePaymentMethod(id: string) {
  const { error } = await supabase.from("payment_methods").delete().eq("id", id);
  if (error) throw error;
}

// ============ COIN PURCHASE REQUESTS ============
export interface CoinPurchaseRequest {
  id: string; user_id: string; method_code: string; coins: number; amount_cents: number;
  currency: string; proof_ref: string | null; proof_note: string | null;
  status: string; admin_note: string | null; created_at: string; reviewed_at: string | null;
  user?: { username: string; display_name: string | null } | null;
}
export async function submitCoinPurchase(input: { method_code: string; coins: number; amount_cents: number; currency?: string; proof_ref?: string; proof_note?: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  const { error } = await supabase.from("coin_purchase_requests").insert({ user_id: u.user.id, currency: "USD", ...input });
  if (error) throw error;
}
export async function fetchMyCoinPurchases(): Promise<CoinPurchaseRequest[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("coin_purchase_requests").select("*").eq("user_id", u.user.id).order("created_at", { ascending: false });
  return (data ?? []) as CoinPurchaseRequest[];
}
export async function fetchAllCoinPurchases(status?: string): Promise<CoinPurchaseRequest[]> {
  let q = supabase.from("coin_purchase_requests")
    .select("*,user:profiles!coin_purchase_requests_user_id_fkey(username,display_name)")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as unknown as CoinPurchaseRequest[];
}
export async function adminApproveCoinPurchase(id: string, note?: string) {
  const { error } = await supabase.rpc("admin_approve_coin_purchase", { _req_id: id, _note: note ?? undefined });
  if (error) throw error;
}
export async function adminRejectCoinPurchase(id: string, note?: string) {
  const { error } = await supabase.rpc("admin_reject_coin_purchase", { _req_id: id, _note: note ?? undefined });
  if (error) throw error;
}

// ============ WITHDRAWALS ============
export interface WithdrawalRequest {
  id: string; author_id: string; coins: number; method_code: string; payout_account: string;
  status: string; admin_note: string | null; created_at: string; reviewed_at: string | null;
  author?: { username: string; display_name: string | null } | null;
}
export async function requestWithdrawal(coins: number, method: string, account: string) {
  const { data, error } = await supabase.rpc("request_withdrawal", { _coins: coins, _method: method, _account: account });
  if (error) throw error;
  return data as string;
}
export async function fetchMyWithdrawals(): Promise<WithdrawalRequest[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("withdrawal_requests").select("*").eq("author_id", u.user.id).order("created_at", { ascending: false });
  return (data ?? []) as WithdrawalRequest[];
}
export async function fetchAllWithdrawals(status?: string): Promise<WithdrawalRequest[]> {
  let q = supabase.from("withdrawal_requests")
    .select("*,author:profiles!withdrawal_requests_author_id_fkey(username,display_name)")
    .order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data } = await q;
  return (data ?? []) as unknown as WithdrawalRequest[];
}
export async function adminApproveWithdrawal(id: string, note?: string) {
  const { error } = await supabase.rpc("admin_approve_withdrawal", { _req_id: id, _note: note ?? undefined });
  if (error) throw error;
}
export async function adminRejectWithdrawal(id: string, note?: string) {
  const { error } = await supabase.rpc("admin_reject_withdrawal", { _req_id: id, _note: note ?? undefined });
  if (error) throw error;
}

// ============ SEARCH: history, trending, suggestions ============
export async function logSearch(query: string) {
  const q = query.trim();
  if (q.length < 2 || q.length > 100) return;
  const { data: u } = await supabase.auth.getUser();
  await supabase.from("search_history").insert({ query: q, user_id: u.user?.id ?? null });
}
export async function fetchMySearchHistory(limit = 10): Promise<string[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase.from("search_history")
    .select("query,created_at").eq("user_id", u.user.id)
    .order("created_at", { ascending: false }).limit(limit * 3);
  const seen = new Set<string>(); const out: string[] = [];
  for (const r of (data ?? []) as { query: string }[]) {
    const k = r.query.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(r.query); if (out.length >= limit) break; }
  }
  return out;
}
export async function fetchTrendingSearches(limit = 10): Promise<{ query: string; hits: number }[]> {
  const { data } = await supabase.from("search_trending" as never).select("query,hits").limit(limit);
  return (data ?? []) as { query: string; hits: number }[];
}
export async function fetchSearchSuggestions(prefix: string, limit = 8): Promise<string[]> {
  const p = prefix.trim();
  if (p.length < 2) return [];
  const safe = p.replace(/[%_,]/g, "");
  const { data } = await supabase.from("novels").select("title").ilike("title", `%${safe}%`).limit(limit);
  return ((data ?? []) as { title: string }[]).map(r => r.title);
}

// ============ USER FOLLOWS ============
export async function followUser(userId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("سجل الدخول");
  if (u.user.id === userId) throw new Error("لا يمكنك متابعة نفسك");
  const { error } = await supabase.from("user_follows").insert({ follower_id: u.user.id, followed_id: userId });
  if (error) throw error;
}
export async function unfollowUser(userId: string) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  await supabase.from("user_follows").delete().eq("follower_id", u.user.id).eq("followed_id", userId);
}
export async function isFollowingUser(userId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return false;
  const { data } = await supabase.from("user_follows").select("follower_id").eq("follower_id", u.user.id).eq("followed_id", userId).maybeSingle();
  return !!data;
}
export async function fetchFollowerCount(userId: string): Promise<number> {
  const { count } = await supabase.from("user_follows").select("*", { count: "exact", head: true }).eq("followed_id", userId);
  return count ?? 0;
}

// ============ RECENTLY VIEWED ============
export async function fetchRecentlyViewed(limit = 12) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) {
    try {
      const raw = localStorage.getItem("recently_viewed");
      const ids = raw ? (JSON.parse(raw) as string[]) : [];
      if (ids.length === 0) return [];
      const { data } = await supabase.from("novels").select("id,slug,title,cover_url,author").in("id", ids.slice(0, limit));
      return data ?? [];
    } catch { return []; }
  }
  const { data } = await supabase.from("reading_history")
    .select("last_read_at,novel:novels(id,slug,title,cover_url,author)")
    .eq("user_id", u.user.id).order("last_read_at", { ascending: false }).limit(limit);
  return ((data ?? []) as { novel: unknown }[]).map(r => r.novel).filter(Boolean);
}
export function pushLocalRecentlyViewed(id: string) {
  try {
    const raw = localStorage.getItem("recently_viewed");
    const ids = raw ? (JSON.parse(raw) as string[]) : [];
    const next = [id, ...ids.filter(x => x !== id)].slice(0, 20);
    localStorage.setItem("recently_viewed", JSON.stringify(next));
  } catch { /* noop */ }
}
