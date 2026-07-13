import { useState } from "react";
import { Star, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";
import { submitFeedback } from "@/lib/enterprise-api";
import { showError } from "@/lib/errors";

export function FeedbackWidget() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!rating) { toast.error(t("fb.pickRating")); return; }
    setBusy(true);
    try {
      await submitFeedback({ rating, message });
      toast.success(t("fb.thanks"));
      setOpen(false); setRating(0); setMessage("");
    } catch (e) { showError(e); } finally { setBusy(false); }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-24 end-4 z-40 grid h-12 w-12 place-items-center rounded-full border border-border/60 bg-surface/80 text-primary shadow-lg backdrop-blur hover:bg-surface md:bottom-6"
        aria-label={t("fb.button")}
      >
        <MessageCircle className="h-5 w-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl border border-border/40 bg-surface p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-3 text-lg font-black">{t("fb.title")}</h2>
            <div className="mb-3 flex justify-center gap-1">
              {[1,2,3,4,5].map(n => (
                <button key={n} onClick={() => setRating(n)} aria-label={`${n}`}>
                  <Star className={`h-8 w-8 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
                </button>
              ))}
            </div>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} maxLength={2000}
              placeholder={t("fb.placeholder")}
              className="w-full rounded-md border border-input bg-background/60 p-3 text-sm" />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>{t("common.cancel")}</Button>
              <Button onClick={send} disabled={busy}>{busy ? t("common.sending") : t("fb.send")}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
