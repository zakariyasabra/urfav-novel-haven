import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-config";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitReport } from "@/lib/site-api";

export const Route = createFileRoute("/dmca")({
  head: () => ({
    meta: [
      { title: "بلاغ حقوق النشر (DMCA) — FAVNOL" },
      { name: "description", content: "بلغ عن انتهاك حقوق النشر لأي محتوى على منصتنا." },
      { property: "og:title", content: "بلاغ حقوق النشر (DMCA) — FAVNOL" },
      { property: "og:description", content: "نموذج بلاغ رسمي عن انتهاك حقوق نشر." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/dmca` }],
  }),
  component: DmcaPage,
});

function DmcaPage() {
  const [state, setState] = useState({ name: "", email: "", url: "", subject: "", content: "" });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try {
      await submitReport({
        type: "dmca", reporter_name: state.name, reporter_email: state.email,
        subject: state.subject, target_url: state.url, content: state.content,
      });
      toast.success("تم استلام بلاغك، سيتم مراجعته خلال 48 ساعة");
      setState({ name: "", email: "", url: "", subject: "", content: "" });
    } catch { toast.error("تعذر الإرسال"); }
    setBusy(false);
  }
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-2 text-4xl font-black">بلاغ حقوق النشر</h1>
      <p className="mb-8 text-muted-foreground">إذا كنت صاحب حقوق النشر لأي محتوى على المنصة، املأ النموذج التالي للإبلاغ عن انتهاك.</p>
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border/60 bg-surface/40 p-6">
        <F label="الاسم الكامل"><input required className="input" value={state.name} onChange={(e) => setState({ ...state, name: e.target.value })} /></F>
        <F label="البريد الإلكتروني"><input type="email" required className="input" value={state.email} onChange={(e) => setState({ ...state, email: e.target.value })} /></F>
        <F label="رابط المحتوى المخالف"><input required type="url" className="input" value={state.url} onChange={(e) => setState({ ...state, url: e.target.value })} /></F>
        <F label="اسم العمل الأصلي"><input required className="input" value={state.subject} onChange={(e) => setState({ ...state, subject: e.target.value })} /></F>
        <F label="تفاصيل الشكوى (إثبات الملكية، وصف الانتهاك)">
          <textarea required rows={6} className="input resize-none" value={state.content} onChange={(e) => setState({ ...state, content: e.target.value })} />
        </F>
        <Button disabled={busy} type="submit" className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          {busy ? "..." : "إرسال البلاغ"}
        </Button>
      </form>
      <style>{`.input{height:2.5rem;width:100%;border-radius:.375rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);padding:0 .75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}textarea.input{height:auto;padding:.75rem}`}</style>
    </div>
  );
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-xs font-semibold">{label}</label>{children}</div>;
}
