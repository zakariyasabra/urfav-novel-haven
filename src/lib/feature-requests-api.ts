import { supabase } from "@/integrations/supabase/client";

export type FRStatus = "submitted" | "planned" | "accepted" | "in_progress" | "completed" | "rejected";

export interface FeatureRequest {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: FRStatus;
  admin_note: string | null;
  votes_count: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export async function fetchFeatureRequests(status?: FRStatus): Promise<FeatureRequest[]> {
  let q = supabase.from("feature_requests").select("*").order("votes_count", { ascending: false }).order("created_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const { data, error } = await q.limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as FeatureRequest[];
}

export async function submitFeatureRequest(input: { title: string; description: string }) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  const { error } = await supabase.from("feature_requests").insert({
    user_id: u.user.id,
    title: input.title.trim().slice(0, 200),
    description: input.description.trim().slice(0, 3000),
  });
  if (error) throw error;
}

export async function fetchMyVotes(): Promise<Set<string>> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return new Set();
  const { data } = await supabase.from("feature_request_votes").select("request_id").eq("user_id", u.user.id);
  return new Set(((data ?? []) as { request_id: string }[]).map((r) => r.request_id));
}

export async function toggleVote(requestId: string, on: boolean) {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) throw new Error("not authenticated");
  if (on) {
    const { error } = await supabase.from("feature_request_votes").insert({ request_id: requestId, user_id: u.user.id });
    if (error && !error.message.includes("duplicate")) throw error;
  } else {
    const { error } = await supabase.from("feature_request_votes").delete().eq("request_id", requestId).eq("user_id", u.user.id);
    if (error) throw error;
  }
}

export async function updateFeatureRequest(id: string, patch: Partial<Pick<FeatureRequest, "status" | "admin_note" | "is_public">>) {
  const { error } = await supabase.from("feature_requests").update(patch).eq("id", id);
  if (error) throw error;
}

export async function broadcastNotification(input: { title: string; body: string; link?: string }) {
  const { data, error } = await supabase.rpc("admin_broadcast_notification", {
    _title: input.title,
    _body: input.body,
    _link: input.link ?? null,
    _type: "announcement",
  });
  if (error) throw error;
  return data as number;
}
