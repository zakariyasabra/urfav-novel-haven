import { supabase } from "@/integrations/supabase/client";

export interface AuthorApplication {
  id: string;
  user_id: string;
  pen_name: string;
  bio: string;
  sample_work: string | null;
  social_links: Record<string, string>;
  status: "pending" | "approved" | "rejected";
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export async function submitAuthorApplication(payload: {
  pen_name: string;
  bio: string;
  sample_work?: string;
  social_links?: Record<string, string>;
}) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("يجب تسجيل الدخول");
  const { error } = await supabase.from("author_applications").insert({
    user_id: u.user.id,
    pen_name: payload.pen_name,
    bio: payload.bio,
    sample_work: payload.sample_work ?? null,
    social_links: payload.social_links ?? {},
  });
  if (error) throw error;
}

export async function fetchMyApplication(): Promise<AuthorApplication | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase
    .from("author_applications")
    .select("*")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data ?? null) as unknown as AuthorApplication | null;
}

export async function fetchAllApplications(status?: string): Promise<AuthorApplication[]> {
  let q = supabase.from("author_applications").select("*").order("created_at", { ascending: false });
  if (status) q = q.eq("status", status as "pending" | "approved" | "rejected");
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as AuthorApplication[];
}

import { approveAuthorApplicationFn, rejectAuthorApplicationFn } from "./author-admin.functions";

export async function approveApplication(id: string, note?: string) {
  await approveAuthorApplicationFn({ data: { id, note } });
}

export async function rejectApplication(id: string, note?: string) {
  await rejectAuthorApplicationFn({ data: { id, note } });
}

export async function fetchMyAuthorNovels() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data, error } = await supabase
    .from("novels")
    .select("id,slug,title,cover_url,status,is_published,views_count,rating_avg,updated_at")
    .eq("owner_id", u.user.id)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
