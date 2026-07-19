// Notification Center — Phase 7
// Category-aware inbox API. Adds to (does not replace) the existing notification bell logic.

import { supabase } from "@/integrations/supabase/client";

export type NotificationCategory =
  | "reading"
  | "marketplace"
  | "battle_pass"
  | "ai"
  | "collections"
  | "followers"
  | "authors"
  | "payments"
  | "admin"
  | "system";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "reading",
  "marketplace",
  "battle_pass",
  "ai",
  "collections",
  "followers",
  "authors",
  "payments",
  "admin",
  "system",
];

export interface NotificationRow {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  archived_at: string | null;
  created_at: string;
  type: string;
  category: NotificationCategory;
  meta: Record<string, unknown>;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
}

export interface InboxQuery {
  category?: NotificationCategory | "all";
  filter?: "all" | "unread" | "archived";
  search?: string;
  limit?: number;
  cursor?: string; // created_at ISO string
}

export async function listInbox(q: InboxQuery = {}): Promise<NotificationRow[]> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return [];

  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(q.limit ?? 50);

  if (q.category && q.category !== "all") query = query.eq("category", q.category);
  if (q.filter === "unread") query = query.eq("is_read", false).is("archived_at", null);
  else if (q.filter === "archived") query = query.not("archived_at", "is", null);
  else query = query.is("archived_at", null);

  if (q.search && q.search.trim()) {
    const s = q.search.trim().replace(/[%(),]/g, "");
    query = query.or(`title.ilike.%${s}%,body.ilike.%${s}%`);
  }
  if (q.cursor) query = query.lt("created_at", q.cursor);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function unreadCountsByCategory(): Promise<Record<NotificationCategory, number>> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  const empty: Record<NotificationCategory, number> = {
    reading: 0,
    marketplace: 0,
    battle_pass: 0,
    ai: 0,
    collections: 0,
    followers: 0,
    authors: 0,
    payments: 0,
    admin: 0,
    system: 0,
  };
  if (!uid) return empty;

  const { data } = await supabase
    .from("notifications")
    .select("category")
    .eq("user_id", uid)
    .eq("is_read", false)
    .is("archived_at", null);

  for (const row of (data ?? []) as { category: NotificationCategory }[]) {
    if (empty[row.category] !== undefined) empty[row.category]++;
  }
  return empty;
}

export async function markAllRead(category?: NotificationCategory): Promise<number> {
  const { data, error } = await supabase.rpc("notifications_mark_all_read", {
    _category: category ?? undefined,
  } as { _category?: string });
  if (error) throw error;
  return (data as number) ?? 0;
}

export async function archiveNotification(id: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("notifications_archive", { _id: id });
  if (error) throw error;
  return Boolean(data);
}

export async function markOneRead(id: string): Promise<void> {
  const { data: userRes } = await supabase.auth.getUser();
  const uid = userRes.user?.id;
  if (!uid) return;
  await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", uid);
}
