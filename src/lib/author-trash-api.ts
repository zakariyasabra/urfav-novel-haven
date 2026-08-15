import { supabase } from "@/integrations/supabase/client";

export const TRASH_RETENTION_DAYS = 30;

export interface TrashNovel {
  id: string;
  title: string;
  slug: string;
  cover_url: string | null;
  deleted_at: string;
  chapters_count: number;
}

export interface TrashChapter {
  id: string;
  novel_id: string;
  novel_title: string;
  chapter_number: number;
  title: string | null;
  deleted_at: string;
}

/** الأيام المتبقية قبل الحذف النهائي (0 = انتهت المدة). */
export function daysLeft(deletedAt: string): number {
  const end = new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * 86400000;
  return Math.max(0, Math.ceil((end - Date.now()) / 86400000));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => supabase as any;

export async function purgeExpiredTrash() {
  await db().rpc("purge_expired_trash");
}

export async function fetchAuthorTrash(): Promise<{
  novels: TrashNovel[];
  chapters: TrashChapter[];
}> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { novels: [], chapters: [] };

  const { data: novelRows, error: nErr } = await db()
    .from("novels")
    .select("id,title,slug,cover_url,deleted_at")
    .eq("owner_id", u.user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (nErr) throw nErr;

  const trashedNovels = (novelRows ?? []) as Array<Omit<TrashNovel, "chapters_count">>;
  const trashedNovelIds = new Set(trashedNovels.map((n) => n.id));

  // كل روايات الكاتب (لمعرفة عناوين الفصول المحذوفة منفردًا)
  const { data: allNovels } = await db()
    .from("novels")
    .select("id,title")
    .eq("owner_id", u.user.id);
  const titleById = new Map<string, string>(
    ((allNovels ?? []) as Array<{ id: string; title: string }>).map((n) => [n.id, n.title]),
  );

  let chapters: TrashChapter[] = [];
  const novelCounts = new Map<string, number>();
  if (titleById.size > 0) {
    const { data: chRows, error: cErr } = await db()
      .from("chapters")
      .select("id,novel_id,chapter_number,title,deleted_at")
      .in("novel_id", [...titleById.keys()])
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (cErr) throw cErr;
    const rows = (chRows ?? []) as Array<Omit<TrashChapter, "novel_title">>;
    for (const r of rows) {
      if (trashedNovelIds.has(r.novel_id)) {
        novelCounts.set(r.novel_id, (novelCounts.get(r.novel_id) ?? 0) + 1);
        continue; // فصول تابعة لرواية محذوفة تُعرض ضمن الرواية
      }
      chapters.push({ ...r, novel_title: titleById.get(r.novel_id) ?? "" });
    }
  }

  return {
    novels: trashedNovels.map((n) => ({ ...n, chapters_count: novelCounts.get(n.id) ?? 0 })),
    chapters,
  };
}

export async function trashNovel(id: string) {
  const { error } = await db().rpc("author_trash_novel", { _novel_id: id });
  if (error) throw error;
}
export async function restoreNovel(id: string) {
  const { error } = await db().rpc("author_restore_novel", { _novel_id: id });
  if (error) throw error;
}
export async function purgeNovel(id: string) {
  const { error } = await db().rpc("author_purge_novel", { _novel_id: id });
  if (error) throw error;
}
export async function trashChapter(id: string) {
  const { error } = await db().rpc("author_trash_chapter", { _chapter_id: id });
  if (error) throw error;
}
export async function restoreChapter(id: string) {
  const { error } = await db().rpc("author_restore_chapter", { _chapter_id: id });
  if (error) throw error;
}
export async function purgeChapter(id: string) {
  const { error } = await db().rpc("author_purge_chapter", { _chapter_id: id });
  if (error) throw error;
}
