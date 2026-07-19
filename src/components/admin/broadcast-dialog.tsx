import { useState } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";
import { showError } from "@/lib/errors";
import { broadcastNotification } from "@/lib/feature-requests-api";

export function BroadcastDialog() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) {
      toast.error(t("bcast.required"));
      return;
    }
    setBusy(true);
    try {
      const n = await broadcastNotification({ title, body, link: link || undefined });
      toast.success(t("bcast.sent", { n: String(n) }));
      setTitle("");
      setBody("");
      setLink("");
      setOpen(false);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        <Megaphone className="me-1 h-4 w-4" />
        {t("bcast.button")}
      </Button>
      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-border/40 bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
              <Megaphone className="h-5 w-5 text-primary" />
              {t("bcast.title")}
            </h2>
            <label className="block text-xs font-semibold">
              {t("bcast.subject")}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold">
              {t("bcast.body")}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                maxLength={1000}
                className="mt-1 w-full rounded-md border border-input bg-background/60 p-3 text-sm"
              />
            </label>
            <label className="mt-3 block text-xs font-semibold">
              {t("bcast.link")}
              <input
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="/vip"
                className="mt-1 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={send} disabled={busy}>
                {busy ? t("common.sending") : t("bcast.send")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
