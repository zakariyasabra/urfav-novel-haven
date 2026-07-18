import { useState } from "react";
import { Share2, Copy, Twitter, Facebook, Send, X, Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

interface Props {
  slug: string;
  title: string;
  novelId: string;
}

export function ShareNovel({ slug, title, novelId }: Props) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const url = typeof window !== "undefined" ? `${window.location.origin}/novels/${slug}` : `/novels/${slug}`;
  const shareText = `${title} — رواية على FAVNOL`;

  async function doShare() {
    if (navigator.share) {
      try { await navigator.share({ title, text: shareText, url }); return; } catch { /* cancelled */ }
    }
    setOpen(true);
  }

  async function copy() {
    await navigator.clipboard.writeText(url);
    toast.success("تم نسخ الرابط");
    setOpen(false);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={doShare} className="border-primary/40">
          <Share2 className="me-1 h-4 w-4" /> مشاركة
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} className="text-muted-foreground">
          <Flag className="me-1 h-4 w-4" /> إبلاغ
        </Button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-sm rounded-xl border border-border/60 bg-popover p-4 text-popover-foreground shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-bold">مشاركة الرواية</div>
              <button onClick={() => setOpen(false)} className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <ShareBtn label="نسخ" onClick={copy}><Copy className="h-5 w-5" /></ShareBtn>
              <ShareBtn label="تويتر" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(url)}`}><Twitter className="h-5 w-5" /></ShareBtn>
              <ShareBtn label="فيسبوك" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}><Facebook className="h-5 w-5" /></ShareBtn>
              <ShareBtn label="تيليجرام" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`}><Send className="h-5 w-5" /></ShareBtn>
            </div>
            <input readOnly value={url} className="mt-3 w-full rounded-md border border-input bg-background/60 p-2 text-xs" onFocus={(e) => e.currentTarget.select()} />
          </div>
        </div>
      )}

      {reportOpen && <ReportDialog novelId={novelId} onClose={() => setReportOpen(false)} />}
    </>
  );
}

function ShareBtn({ label, onClick, href, children }: { label: string; onClick?: () => void; href?: string; children: React.ReactNode }) {
  const cls = "flex flex-col items-center gap-1 rounded-lg border border-border/60 p-3 text-xs hover:border-primary hover:text-primary";
  if (href) return <a target="_blank" rel="noreferrer" href={href} className={cls}>{children}<span>{label}</span></a>;
  return <button onClick={onClick} className={cls}>{children}<span>{label}</span></button>;
}

function ReportDialog({ novelId, onClose }: { novelId: string; onClose: () => void }) {
  const { user } = useAuth();
  const [reason, setReason] = useState("copyright");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      type: reason, target_id: novelId, subject: `Novel report: ${reason}`,
      content: details.slice(0, 2000) || reason,
      reporter_id: user?.id ?? null, reporter_email: user ? null : email,
    });
    setBusy(false);
    if (error) return toast.error("تعذر الإرسال");
    toast.success("تم إرسال البلاغ. شكراً لك");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-border/60 bg-popover p-4 text-popover-foreground shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-bold">الإبلاغ عن الرواية</div>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full hover:bg-secondary"><X className="h-4 w-4" /></button>
        </div>
        <label className="mb-2 block text-xs font-semibold">السبب</label>
        <select value={reason} onChange={(e) => setReason(e.target.value)}
          className="mb-3 w-full rounded-md border border-input bg-background/60 p-2 text-sm">
          <option value="copyright">انتهاك حقوق النشر</option>
          <option value="inappropriate">محتوى غير لائق</option>
          <option value="spam">سبام</option>
          <option value="other">آخر</option>
        </select>
        {!user && (
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="بريدك الإلكتروني"
            className="mb-2 w-full rounded-md border border-input bg-background/60 p-2 text-sm" />
        )}
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} placeholder="تفاصيل إضافية..."
          className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm" />
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md border border-border/60 px-3 py-1.5 text-sm hover:bg-secondary">إلغاء</button>
          <button onClick={submit} disabled={busy || (!user && !email)}
            className="rounded-md bg-gradient-to-r from-primary to-primary-glow px-3 py-1.5 text-sm font-bold text-primary-foreground disabled:opacity-50">إرسال</button>
        </div>
      </div>
    </div>
  );
}
