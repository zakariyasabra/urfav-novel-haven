import { supabase } from "@/integrations/supabase/client";

/**
 * Fetch comments for a novel or chapter with author profiles.
 */
export async function fetchComments(novelId: string) {
  // 1. جلب التعليقات الأساسية بدون استخدام الـ Join لـ profiles
  const { data, error } = await supabase
    .from("comments")
    .select(`
      id,
      user_id,
      content,
      created_at,
      parent_id,
      is_pinned,
      is_spoiler,
      likes_count,
      selection_text,
      selection_hash
    `)
    .eq("novel_id", novelId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching comments:", error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // 2. استخراج معرفات المستخدمين الفريدة (userIds) لمنع التكرار
  const userIds = [...new Set(data.map((c: any) => c.user_id))];

  // 3. جلب بيانات البروفايلات دفعة واحدة للمستخدمين الموجودين في التعليقات
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, display_name")
    .in("id", userIds);

  if (profilesError) {
    console.error("Error fetching profiles for comments:", profilesError);
  }

  // 4. إنشاء خريطة (Map) سريعة للوصول إلى بيانات البروفايل باستخدام الـ id
  const profileMap = new Map(
    (profiles ?? []).map((p: any) => [p.id, p])
  );

  // 5. دمج التعليقات مع بيانات البروفايل الخاصة بكل صاحب تعليق
  return data.map((c: any) => ({
    ...c,
    profile: profileMap.get(c.user_id) ?? null,
  }));
}
