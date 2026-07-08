import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site-config";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { submitReport } from "@/lib/site-api";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "تواصل معنا — UR Fav Novel" },
      { name: "description", content: "هل لديك اقتراح، شكوى، أو استفسار؟ راسلنا الآن." },
      { property: "og:title", content: "تواصل معنا — UR Fav Novel" },
      { property: "og:description", content: "نموذج تواصل مباشر مع فريق UR Fav Novel." },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/contact` }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await submitReport({ type: "contact", reporter_name: name, reporter_email: email, subject, content });
      toast.success("تم إرسال رسالتك، سنعود إليك قريباً");
      setName(""); setEmail(""); setSubject(""); setContent("");
    } catch (err) {
      toast.error("تعذر الإرسال");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="mb-2 text-4xl font-black">تواصل معنا</h1>
      <p className="mb-8 text-muted-foreground">نسعد بتلقي ملاحظاتك واقتراحاتك.</p>
      <form onSubmit={submit} className="space-y-3 rounded-2xl border border-border/60 bg-surface/40 p-6">
        <Field label="الاسم"><input required value={name} onChange={(e) => setName(e.target.value)} className="input" /></Field>
        <Field label="البريد الإلكتروني"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" /></Field>
        <Field label="الموضوع"><input required value={subject} onChange={(e) => setSubject(e.target.value)} className="input" /></Field>
        <Field label="الرسالة">
          <textarea required rows={6} value={content} onChange={(e) => setContent(e.target.value)} className="input resize-none" />
        </Field>
        <Button disabled={busy} type="submit" className="h-11 w-full bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          {busy ? "..." : "إرسال"}
        </Button>
      </form>
      <style>{`.input{height:2.5rem;width:100%;border-radius:.375rem;border:1px solid hsl(var(--input));background:hsl(var(--background)/.6);padding:0 .75rem;font-size:.875rem;outline:none}.input:focus{border-color:hsl(var(--primary))}textarea.input{height:auto;padding:.75rem}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">{label}</label>
      {children}
    </div>
  );
}
