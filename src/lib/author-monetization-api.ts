// Batch 7D — Author Monetization client API.
// Provider-agnostic; reuses gift_coins for reader tips and request_withdrawal
// for payouts. No provider SDKs.
import { supabase } from "@/integrations/supabase/client";

// ── Reader tips ────────────────────────────────────────────────────────────
// Tips are gift_coins under the hood (90% author share). Kept as a distinct
// export so UI code reads intent-first.
export async function tipAuthor(input: {
  author_id: string;
  amount: number;
  novel_id?: string | null;
  message?: string | null;
}) {
  const { data, error } = await supabase.rpc("gift_coins", {
    _author_id: input.author_id,
    _amount: input.amount,
    _novel_id: input.novel_id ?? undefined,
    _message: input.message ?? undefined,
  });
  if (error) throw error;
  return data as { ok: boolean; balance?: number };
}

// ── Revenue summary ────────────────────────────────────────────────────────
export interface AuthorRevenueSummary {
  lifetime: number;
  available: number;
  paid_out: number;
  in_flight: number;
  this_month: number;
  last_30d: number;
}
export async function getRevenueSummary(): Promise<AuthorRevenueSummary> {
  const { data, error } = await supabase.rpc("author_revenue_summary");
  if (error) throw error;
  return (data ?? {
    lifetime: 0, available: 0, paid_out: 0, in_flight: 0, this_month: 0, last_30d: 0,
  }) as AuthorRevenueSummary;
}

// ── Revenue timeseries ─────────────────────────────────────────────────────
export type RevenueBucket = "day" | "week" | "month";
export interface RevenueTimePoint {
  bucket_start: string;
  coins: number;
  tip_coins: number;
  unlock_coins: number;
}
export async function getRevenueTimeseries(
  bucket: RevenueBucket = "day",
  days = 30,
): Promise<RevenueTimePoint[]> {
  const { data, error } = await supabase.rpc("author_revenue_timeseries", {
    _bucket: bucket, _days: days,
  });
  if (error) throw error;
  return ((data ?? []) as Array<{
    bucket_start: string; coins: number | string;
    tip_coins: number | string; unlock_coins: number | string;
  }>).map((r) => ({
    bucket_start: r.bucket_start,
    coins: Number(r.coins),
    tip_coins: Number(r.tip_coins),
    unlock_coins: Number(r.unlock_coins),
  }));
}

// ── Top performers ─────────────────────────────────────────────────────────
export interface TopNovelRow {
  novel_id: string; title: string; slug: string; cover_url: string | null;
  coins: number; tip_coins: number; unlock_coins: number;
}
export async function getTopNovels(limit = 5, days: number | null = null): Promise<TopNovelRow[]> {
  const { data, error } = await supabase.rpc("author_top_novels", {
    _limit: limit, _days: days ?? undefined,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    novel_id: r.novel_id as string,
    title: r.title as string,
    slug: r.slug as string,
    cover_url: (r.cover_url as string | null) ?? null,
    coins: Number(r.coins),
    tip_coins: Number(r.tip_coins),
    unlock_coins: Number(r.unlock_coins),
  }));
}

export interface TopChapterRow {
  chapter_id: string; chapter_number: number; title: string;
  novel_id: string; novel_slug: string; novel_title: string; coins: number;
}
export async function getTopChapters(limit = 5, days: number | null = null): Promise<TopChapterRow[]> {
  const { data, error } = await supabase.rpc("author_top_chapters", {
    _limit: limit, _days: days ?? undefined,
  });
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
    chapter_id: r.chapter_id as string,
    chapter_number: Number(r.chapter_number),
    title: r.title as string,
    novel_id: r.novel_id as string,
    novel_slug: r.novel_slug as string,
    novel_title: r.novel_title as string,
    coins: Number(r.coins),
  }));
}

// ── Withdrawals ────────────────────────────────────────────────────────────
export type WithdrawProvider = "manual" | "stripe" | "paypal" | "wise" | "crypto";

/**
 * Request a payout. Optional `provider` is a forward-compat hint for future
 * automated payout rails (Stripe/PayPal/Wise/crypto). Server default = 'manual'
 * which keeps the current admin-reviewed flow unchanged.
 */
export async function requestAuthorWithdrawal(input: {
  coins: number;
  method_code: string;
  payout_account: string;
  provider?: WithdrawProvider;
}) {
  const { data, error } = await supabase.rpc("request_withdrawal", {
    _coins: input.coins,
    _method: input.method_code,
    _account: input.payout_account,
    _provider: input.provider ?? "manual",
  });
  if (error) throw error;
  return data as string;
}
