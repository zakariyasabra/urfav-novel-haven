import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchMyApplication, submitAuthorApplication } from "@/lib/author-api";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/author/apply")({
  head: () => ({ meta: [{ title: "التقديم ككاتب — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: ApplyPage,
});

function ApplyPage() {
  const { isAuthor } = useAuth();
  const appQ = useQuery({ queryKey: ["my-author-app"], queryFn: fetchMyApplication });
  const [penName, setPenName] = useState("");
  const [bio, setBio] = useState("");
  const [sample, setSample] = useState("");
  const [twitter, setTwitter] = useState("");
  const [busy, setBusy] = useState(false);

  if (isAuthor) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-black">أنت كاتب بالفعل ✍️</h1>
        <p className="mb-6 text-muted-foreground">يمكنك الانتقال إلى لوحة الكاتب لإدارة رواياتك.</p>
        <Button asChild><Link to="/author">لوحة الكاتب</Link></Button>
      </div>
    );
  }

  const existing = appQ.data;
  if (existing && existing.status === "pending") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-3 text-2xl font-black">طلبك قيد المراجعة ⏳</h1>
        <p className="text-muted-foreground">سنقوم بمراجعة طلبك قريباً وإشعارك بالنتيجة.</p>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (penName.trim().length < 2 || bio.trim().length < 20) {
      toast.error("يرجى ملء الاسم القلمي ونبذة لا تقل عن 20 حرفاً");
      return;
    }
    setBusy(true);
    try {
      await submitAuthorApplication({
        pen_name: penName.trim(),
        bio: bio.trim(),
        sample_work: sample.trim() || undefined,
        social_links: twitter.trim() ? { twitter: twitter.trim() } : {},
      });
      toast.success("تم إرسال طلبك بنجاح");
      appQ.refetch();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-2 text-3xl font-black">التقديم ككاتب</h1>
      <p className="mb-6 text-muted-foreground">
        شاركنا رواياتك الأصلية وابدأ رحلتك ككاتب على منصتنا. سنراجع طلبك خلال أيام قليلة.
      </p>

      {existing && existing.status === "rejected" && (
        <div className="mb-6 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm">
          <div className="font-bold">تم رفض طلبك السابق</div>
          {existing.admin_note && <div className="mt-1 text-muted-foreground">{existing.admin_note}</div>}
          <div className="mt-2 text-muted-foreground">يمكنك تحسين طلبك وإعادة التقديم.</div>
        </div>
      )}

      <form onSubmit={submit} className="space-y-4 rounded-2xl border border-border/40 bg-surface/40 p-6">
        <Field label="الاسم القلمي *">
          <input value={penName} onChange={(e) => setPenName(e.target.value)} required maxLength={80}
            className="input" placeholder="مثلاً: أحمد الخيال" />
        </Field>
        <Field label="نبذة عنك * (20 حرفاً على الأقل)">
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} required minLength={20} rows={5}
            className="input resize-y" placeholder="حدثنا عن نفسك وعن أسلوبك في الكتابة..." />
        </Field>
        <Field label="عينة من كتاباتك (اختياري)">
          <textarea value={sample} onChange={(e) => setSample(e.target.value)} rows={6}
            className="input resize-y" placeholder="ألصق فقرة قصيرة من إحدى رواياتك" />
        </Field>
        <Field label="حساب تويتر / X (اختياري)">
          <input value={twitter} onChange={(e) => setTwitter(e.target.value)}
            className="input" placeholder="@username" />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">{busy ? "جاري الإرسال..." : "إرسال الطلب"}</Button>
      </form>

      <style>{`.input{width:100%;height:auto;min-height:40px;padding:0.5rem 0.75rem;border-radius:0.5rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);font-size:0.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-semibold">{label}</div>
      {children}
    </label>
  );
}
