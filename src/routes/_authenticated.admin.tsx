import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, BookOpen, Layers, Users, MessageSquare, BarChart3, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchNovels, fetchChapters, fetchGenres } from "@/lib/api";
import { coverUrl } from "@/lib/covers";
import { statusLabel, formatViews } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "لوحة الإدارة — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"stats" | "novels" | "chapters" | "users" | "comments">("stats");

  useEffect(() => { if (!loading && !isAdmin) nav({ to: "/" }); }, [loading, isAdmin]);
  if (!isAdmin) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-black md:text-4xl">لوحة الإدارة</h1>
      <div className="mb-6 flex flex-wrap gap-1 rounded-lg border border-border/60 bg-surface/40 p-1">
        {[
          { key: "stats", label: "الإحصائيات", icon: BarChart3 },
          { key: "novels", label: "الروايات", icon: BookOpen },
          { key: "chapters", label: "الفصول", icon: Layers },
          { key: "users", label: "المستخدمون", icon: Users },
          { key: "comments", label: "التعليقات", icon: MessageSquare },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key as typeof tab)}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold ${tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
          >
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === "stats" && <StatsTab />}
      {tab === "novels" && <NovelsTab />}
      {tab === "chapters" && <ChaptersTab />}
      {tab === "users" && <UsersTab />}
      {tab === "comments" && <CommentsTab />}
    </div>
  );
}

function StatsTab() {
  const q = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [novels, chapters, users, comments] = await Promise.all([
        supabase.from("novels").select("*", { count: "exact", head: true }),
        supabase.from("chapters").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
      ]);
      return {
        novels: novels.count ?? 0,
        chapters: chapters.count ?? 0,
        users: users.count ?? 0,
        comments: comments.count ?? 0,
      };
    },
  });
  const stats = q.data;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat label="الروايات" value={stats?.novels ?? 0} icon={<BookOpen />} />
      <Stat label="الفصول" value={stats?.chapters ?? 0} icon={<Layers />} />
      <Stat label="المستخدمون" value={stats?.users ?? 0} icon={<Users />} />
      <Stat label="التعليقات" value={stats?.comments ?? 0} icon={<MessageSquare />} />
    </div>
  );
}
function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-6">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="text-3xl font-black">{formatViews(value)}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function NovelsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-novels"], queryFn: () => fetchNovels({ sort: "newest" }) });
  const [editing, setEditing] = useState<string | "new" | null>(null);

  async function del(id: string) {
    if (!confirm("حذف هذه الرواية وجميع فصولها؟")) return;
    const { error } = await supabase.from("novels").delete().eq("id", id);
    if (error) return toast.error("تعذر الحذف");
    toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-novels"] });
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"><Plus className="me-1 h-4 w-4" />رواية جديدة</Button>
      </div>
      <div className="space-y-3">
        {(q.data ?? []).map((n) => (
          <div key={n.id} className="flex items-center gap-4 rounded-xl border border-border/40 bg-surface/40 p-3">
            <img src={coverUrl(n.cover_url)} alt="" className="h-20 w-14 rounded object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">{n.title}</div>
              <div className="text-xs text-muted-foreground">{n.author} · {statusLabel(n.status)} · {formatViews(n.views_count)} مشاهدة</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(n.id)}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => del(n.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      {editing && (
        <NovelForm
          novelId={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-novels"] }); }}
        />
      )}
    </div>
  );
}

function NovelForm({ novelId, onClose }: { novelId: string | null; onClose: () => void }) {
  const [form, setForm] = useState({
    slug: "", title: "", author: "", translator: "", cover_url: "", description: "",
    status: "ongoing", is_featured: false,
  });
  const [genres, setGenres] = useState<string[]>([]);
  const allGenres = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!novelId) return;
    supabase.from("novels").select("*, novel_genres(genre_id)").eq("id", novelId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const d = data as unknown as { slug: string; title: string; author: string; translator: string | null; cover_url: string | null; description: string; status: string; is_featured: boolean; novel_genres: { genre_id: string }[] };
      setForm({
        slug: d.slug, title: d.title, author: d.author, translator: d.translator ?? "",
        cover_url: d.cover_url ?? "", description: d.description, status: d.status, is_featured: d.is_featured,
      });
      setGenres(d.novel_genres.map((g) => g.genre_id));
    });
  }, [novelId]);

  async function save() {
    setBusy(true);
    const payload = { ...form, status: form.status as "ongoing" | "completed" | "hiatus" };
    let id = novelId;
    if (novelId) {
      const { error } = await supabase.from("novels").update(payload).eq("id", novelId);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { data, error } = await supabase.from("novels").insert(payload).select("id").maybeSingle();
      if (error || !data) { setBusy(false); return toast.error(error?.message ?? "خطأ"); }
      id = data.id;
    }
    // sync genres
    if (id) {
      await supabase.from("novel_genres").delete().eq("novel_id", id);
      if (genres.length) {
        await supabase.from("novel_genres").insert(genres.map((g) => ({ novel_id: id!, genre_id: g })));
      }
    }
    setBusy(false);
    toast.success("تم الحفظ");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black">{novelId ? "تعديل رواية" : "رواية جديدة"}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label="المعرف (slug)" value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
          <Input label="العنوان" value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Input label="المؤلف" value={form.author} onChange={(v) => setForm({ ...form, author: v })} />
          <Input label="المترجم" value={form.translator} onChange={(v) => setForm({ ...form, translator: v })} />
          <Input label="رابط الغلاف (cover-1 أو رابط كامل)" value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} />
          <div>
            <label className="mb-1 block text-xs font-semibold">الحالة</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
              <option value="ongoing">مستمرة</option>
              <option value="completed">مكتملة</option>
              <option value="hiatus">متوقفة</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full resize-none rounded-md border border-input bg-background/60 p-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">التصنيفات</label>
            <div className="flex flex-wrap gap-2">
              {(allGenres.data ?? []).map((g) => {
                const on = genres.includes(g.id);
                return (
                  <button key={g.id} type="button" onClick={() => setGenres(on ? genres.filter((x) => x !== g.id) : [...genres, g.id])}
                    className={`rounded-md border px-2 py-1 text-xs ${on ? "border-primary bg-primary/20 text-primary" : "border-border/60"}`}>
                    {g.name_ar}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            <span className="text-sm">مميزة (تظهر في العرض الرئيسي)</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button disabled={busy} onClick={save} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">حفظ</Button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function ChaptersTab() {
  const qc = useQueryClient();
  const novelsQ = useQuery({ queryKey: ["admin-novels"], queryFn: () => fetchNovels({ sort: "newest" }) });
  const [novelId, setNovelId] = useState<string>("");
  const chaptersQ = useQuery({ queryKey: ["chapters", novelId], queryFn: () => fetchChapters(novelId), enabled: !!novelId });
  const [editing, setEditing] = useState<string | "new" | null>(null);

  useEffect(() => { if (!novelId && novelsQ.data?.[0]) setNovelId(novelsQ.data[0].id); }, [novelsQ.data]);

  async function del(id: string) {
    if (!confirm("حذف هذا الفصل؟")) return;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) return toast.error("تعذر الحذف");
    toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["chapters", novelId] });
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <select value={novelId} onChange={(e) => setNovelId(e.target.value)} className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm">
          {(novelsQ.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>
        <Button onClick={() => setEditing("new")} disabled={!novelId} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"><Plus className="me-1 h-4 w-4" />فصل جديد</Button>
      </div>
      <div className="space-y-2">
        {(chaptersQ.data ?? []).map((c) => (
          <div key={c.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold">الفصل {c.chapter_number} — {c.title}</div>
              <div className="text-xs text-muted-foreground">{formatViews(c.views_count)} مشاهدة</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditing(c.id)}><Pencil className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      {editing && novelId && (
        <ChapterForm
          novelId={novelId}
          chapterId={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["chapters", novelId] }); }}
        />
      )}
    </div>
  );
}

function ChapterForm({ novelId, chapterId, onClose }: { novelId: string; chapterId: string | null; onClose: () => void }) {
  const [form, setForm] = useState({ chapter_number: 1, title: "", content: "", is_vip: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!chapterId) return;
    supabase.from("chapters").select("*").eq("id", chapterId).maybeSingle().then(({ data }) => {
      if (data) setForm({ chapter_number: data.chapter_number, title: data.title, content: data.content, is_vip: data.is_vip });
    });
  }, [chapterId]);

  async function save() {
    setBusy(true);
    if (chapterId) {
      const { error } = await supabase.from("chapters").update(form).eq("id", chapterId);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from("chapters").insert({ ...form, novel_id: novelId });
      if (error) { setBusy(false); return toast.error(error.message); }
    }
    setBusy(false); toast.success("تم الحفظ"); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black">{chapterId ? "تعديل الفصل" : "فصل جديد"}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input label="رقم الفصل" value={String(form.chapter_number)} onChange={(v) => setForm({ ...form, chapter_number: Number(v) || 0 })} />
            <div className="md:col-span-2"><Input label="العنوان" value={form.title} onChange={(v) => setForm({ ...form, title: v })} /></div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">المحتوى</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={16} className="w-full resize-y rounded-md border border-input bg-background/60 p-3 font-serif text-sm leading-loose" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_vip} onChange={(e) => setForm({ ...form, is_vip: e.target.checked })} />
            <span className="text-sm">فصل VIP</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button disabled={busy} onClick={save} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">حفظ</Button>
        </div>
      </div>
    </div>
  );
}

function UsersTab() {
  const q = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,username,display_name,is_vip,created_at").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((u) => (
        <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
          <div className="min-w-0 flex-1">
            <div className="truncate font-bold">{u.display_name || u.username}</div>
            <div className="text-xs text-muted-foreground">@{u.username}</div>
          </div>
          {u.is_vip && <span className="rounded-md bg-gold/20 px-2 py-0.5 text-xs font-bold text-gold">VIP</span>}
        </div>
      ))}
    </div>
  );
}

function CommentsTab() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("id,content,created_at,profile:profiles(username), novel:novels(title,slug)").order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as unknown as { id: string; content: string; created_at: string; profile: { username: string } | null; novel: { title: string; slug: string } | null }[];
    },
  });
  async function del(id: string) {
    if (!confirm("حذف التعليق؟")) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error("تعذر الحذف");
    toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-comments"] });
  }
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((c) => (
        <div key={c.id} className="rounded-lg border border-border/40 bg-surface/40 p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span><b className="text-primary">@{c.profile?.username}</b> على {c.novel?.title}</span>
            <Button size="sm" variant="outline" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="text-sm">{c.content}</div>
        </div>
      ))}
    </div>
  );
}
