import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/author/novels/new")({
  head: () => ({ meta: [{ title: "رواية جديدة — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: NewNovelPage,
});

function slugify(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9\u0600-\u06FF-]/g, "").slice(0, 80) || `novel-${Date.now()}`;
}

function NewNovelPage() {
  const { user, isAuthor, loading } = useAuth();
  const nav = useNavigate();
  useEffect(() => { if (!loading && !isAuthor) nav({ to: "/author/apply" }); }, [loading, isAuthor]);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"ongoing" | "completed" | "hiatus">("ongoing");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 2 || description.trim().length < 20) {
      toast.error("يرجى ملء العنوان والوصف (20 حرفاً على الأقل)");
      return;
    }
    setBusy(true);
    try {
      const slug = slugify(title) + "-" + Math.random().toString(36).slice(2, 6);
      const { data, error } = await supabase.from("novels").insert({
        slug, title: title.trim(), author: author.trim() || "غير معروف",
        description: description.trim(), status, owner_id: user.id, is_published: false,
      }).select("id").single();
      if (error) throw error;
      toast.success("تم إنشاء الرواية كمسودة");
      nav({ to: "/author/novels/$id", params: { id: (data as { id: string }).id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-black md:text-3xl">رواية جديدة</h1>
      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/40 bg-surface/40 p-6">
        <Field label="العنوان *">
          <input required maxLength={200} value={title} onChange={(e) => setTitle(e.target.value)} className="input" />
        </Field>
        <Field label="اسم المؤلف (يمكن تركه فارغاً)">
          <input maxLength={100} value={author} onChange={(e) => setAuthor(e.target.value)} className="input" />
        </Field>
        <Field label="الوصف *">
          <textarea required minLength={20} rows={5} value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-y" />
        </Field>
        <Field label="الحالة">
          <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="input">
            <option value="ongoing">مستمرة</option>
            <option value="completed">مكتملة</option>
            <option value="hiatus">متوقفة</option>
          </select>
        </Field>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "جاري..." : "إنشاء المسودة"}</Button>
      </form>
      <style>{`.input{width:100%;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="mb-1.5 text-sm font-semibold">{label}</div>{children}</label>;
}
