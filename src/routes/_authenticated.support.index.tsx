import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, usePreferences } from "@/i18n/provider";
import { showError } from "@/lib/errors";
import { createTicket, fetchMyTickets, type TicketCategory } from "@/lib/support-api";

export const Route = createFileRoute("/_authenticated/support/")({
  head: () => ({ meta: [{ title: "Support — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: SupportIndex,
});

const CATEGORIES: TicketCategory[] = [
  "bug",
  "suggestion",
  "feature",
  "translation",
  "novel",
  "chapter",
  "payment",
  "account",
  "copyright",
  "abuse",
  "other",
];

function SupportIndex() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["my-tickets"], queryFn: fetchMyTickets });
  const [open, setOpen] = useState(false);
  const [cat, setCat] = useState<TicketCategory>("bug");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const statusColor: Record<string, string> = {
    new: "bg-primary/20 text-primary",
    assigned: "bg-amber-500/20 text-amber-500",
    in_progress: "bg-blue-500/20 text-blue-500",
    waiting_user: "bg-orange-500/20 text-orange-500",
    resolved: "bg-emerald-500/20 text-emerald-500",
    closed: "bg-muted text-muted-foreground",
    rejected: "bg-destructive/20 text-destructive",
  };

  async function submit() {
    if (!subject.trim() || !body.trim()) {
      toast.error(t("support.required"));
      return;
    }
    setBusy(true);
    try {
      await createTicket({ category: cat, subject, body });
      toast.success(t("support.submitted"));
      setSubject("");
      setBody("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-tickets"] });
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <LifeBuoy className="h-6 w-6 text-primary" />
            {t("support.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("support.subtitle")}</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="me-1 h-4 w-4" />
          {t("support.new")}
        </Button>
      </header>

      {open && (
        <div className="mb-6 rounded-2xl border border-border/50 bg-surface/40 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold">
              {t("support.category")}
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value as TicketCategory)}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {t(`support.cat.${c}`)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              {t("support.subject")}
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
                className="mt-1 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
              />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              {t("support.description")}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                maxLength={5000}
                className="mt-1 w-full rounded-md border border-input bg-background/60 p-3 text-sm"
              />
            </label>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy ? t("common.saving") : t("support.submit")}
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {q.isLoading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-surface/40" />
          ))}
        {(q.data ?? []).map((tk) => (
          <Link
            key={tk.id}
            to="/support/$id"
            params={{ id: tk.id }}
            className="block rounded-xl border border-border/40 bg-surface/40 p-4 transition-colors hover:border-primary/60"
          >
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{tk.subject}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t(`support.cat.${tk.category}`)} ·{" "}
                  {new Date(tk.created_at).toLocaleString(locale)}
                </div>
              </div>
              <span
                className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${statusColor[tk.status] ?? "bg-muted"}`}
              >
                {t(`support.status.${tk.status}`)}
              </span>
            </div>
          </Link>
        ))}
        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
            <div className="mb-1 font-bold">{t("support.empty")}</div>
            <div className="text-sm text-muted-foreground">{t("support.emptyHint")}</div>
          </div>
        )}
      </div>
    </div>
  );
}
