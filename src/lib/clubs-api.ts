import { supabase } from "@/integrations/supabase/client";

export interface ReadingClub {
  id: string;
  slug: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  cover_url: string | null;
  owner_id: string;
  novel_id: string | null;
  is_private: boolean;
  is_archived: boolean;
  member_count: number;
  post_count: number;
  created_at: string;
}

export interface ClubPost {
  id: string;
  club_id: string;
  author_id: string;
  title: string | null;
  content: string;
  novel_id: string | null;
  chapter_id: string | null;
  is_pinned: boolean;
  reply_count: number;
  like_count: number;
  created_at: string;
}

export interface ClubReply {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export async function listClubs(opts: { search?: string; novelId?: string; limit?: number } = {}) {
  let q = supabase
    .from("reading_clubs")
    .select("*")
    .eq("is_archived", false)
    .order("member_count", { ascending: false })
    .limit(opts.limit ?? 50);
  if (opts.novelId) q = q.eq("novel_id", opts.novelId);
  if (opts.search) {
    const safe = opts.search.replace(/[,()%*]/g, "").slice(0, 60);
    q = q.or(`name_ar.ilike.%${safe}%,name_en.ilike.%${safe}%`);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as ReadingClub[];
}

export async function getClubBySlug(slug: string) {
  const { data, error } = await supabase
    .from("reading_clubs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data as ReadingClub | null;
}

export async function isClubMember(clubId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await supabase
    .from("reading_club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) return false;
  return !!data;
}

export async function createClub(input: {
  slug: string;
  name_ar: string;
  name_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  novel_id?: string | null;
  is_private?: boolean;
  cover_url?: string | null;
}) {
  const { data, error } = await supabase.rpc("club_create", {
    p_slug: input.slug,
    p_name_ar: input.name_ar,
    p_name_en: input.name_en ?? undefined,
    p_description_ar: input.description_ar ?? undefined,
    p_description_en: input.description_en ?? undefined,
    p_novel_id: input.novel_id ?? undefined,
    p_is_private: input.is_private ?? false,
    p_cover_url: input.cover_url ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function joinClub(clubId: string) {
  const { error } = await supabase.rpc("club_join", { p_club_id: clubId });
  if (error) throw error;
}

export async function leaveClub(clubId: string) {
  const { error } = await supabase.rpc("club_leave", { p_club_id: clubId });
  if (error) throw error;
}

export async function listClubPosts(clubId: string, limit = 30) {
  const { data, error } = await supabase
    .from("reading_club_posts")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ClubPost[];
}

export async function createClubPost(input: {
  club_id: string;
  content: string;
  title?: string | null;
  novel_id?: string | null;
  chapter_id?: string | null;
}) {
  const { data, error } = await supabase.rpc("club_post_create", {
    p_club_id: input.club_id,
    p_content: input.content,
    p_title: input.title ?? undefined,
    p_novel_id: input.novel_id ?? undefined,
    p_chapter_id: input.chapter_id ?? undefined,
  });
  if (error) throw error;
  return data as string;
}

export async function listPostReplies(postId: string) {
  const { data, error } = await supabase
    .from("reading_club_post_replies")
    .select("*")
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClubReply[];
}

export async function replyToPost(postId: string, content: string) {
  const { data, error } = await supabase.rpc("club_reply_create", {
    p_post_id: postId,
    p_content: content,
  });
  if (error) throw error;
  return data as string;
}
