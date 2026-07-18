import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT, usePreferences } from "@/i18n/provider";
import { showError } from "@/lib/errors";
import { fetchTicket, fetchTicketMessages, replyTicket } from "@/lib/support-api";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/support/$id")({
  head: () => ({ meta: [{ title: "Ticket — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: TicketPage,
});

function TicketPage() {
  const { id } = Route.useParams();
  const t = useT();
  const { lang } = usePreferences();
  const { isAdmin } = useAuth();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const qc = useQueryClient();
  const tq = useQuery({ queryKey: ["ticket", id], queryFn: () => fetchTicket(id) });
  const mq = useQuery({ queryKey: ["ticket-msgs", id], queryFn: () => fetchTicketMessages(id) });
  const [reply, setReply] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await replyTicket(id, reply, internal);
      setReply("");
      qc.invalidateQueries({ queryKey: ["ticket-msgs", id] });
    } catch (e) { showError(e); } finally { setBusy(false); }
  }

  if (tq.isLoading) return <div className="mx-auto max-w-4xl px-4 py-10"><div className="h-64 animate-pulse rounded-xl bg-surface/40" /></div>;
  const tk = tq.data;
  if (!tk) return <div className="mx-auto max-w-4xl px-4 py-10 text-center text-muted-foreground">{t("support.notFound")}</div>;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link to="/support" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="h-4 w-4" />{t("support.back")}
      </Link>
      <div className="rounded-2xl border border-border/40 bg-surface/40 p-5">
        <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <h1 className="text-xl font-black md:text-2xl">{tk.subject}</h1>
          <span className="shrink-0 rounded-md bg-primary/20 px-2 py-1 text-xs font-semibold text-primary">
            {t(`support.status.${tk.status}`)}
          </span>
        </div>
        <div className="mb-3 text-xs text-muted-foreground">
          {t(`support.cat.${tk.category}`)} · {new Date(tk.created_at).toLocaleString(locale)} · {t(`support.prio.${tk.priority}`)}
        </div>
        <p className="whitespace-pre-wrap text-sm">{tk.body}</p>
      </div>

      <div className="mt-6 space-y-3">
        {(mq.data ?? []).map((m) => (
          <div key={m.id} className={`rounded-xl border p-4 ${
            m.is_internal ? "border-amber-500/40 bg-amber-500/5" :
            m.author_id === tk.user_id ? "border-border/40 bg-surface/30" : "border-primary/30 bg-primary/5"
          }`}>
            <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold">
                {m.is_internal ? t("support.internal") : m.author_id === tk.user_id ? t("support.user") : t("support.staff")}
              </span>
              <span>·</span>
              <span>{new Date(m.created_at).toLocaleString(locale)}</span>
            </div>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </div>
        ))}
      </div>

      {tk.status !== "closed" && tk.status !== "rejected" && (
        <div className="mt-6 rounded-2xl border border-border/40 bg-surface/40 p-4">
          <textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={4} maxLength={4000}
            placeholder={t("support.replyPh")}
            className="w-full rounded-md border border-input bg-background/60 p-3 text-sm" />
          <div className="mt-2 flex items-center justify-between gap-2">
            {isAdmin ? (
              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                {t("support.internalNote")}
              </label>
            ) : <div />}
            <Button onClick={send} disabled={busy || !reply.trim()}>
              <Send className="me-1 h-4 w-4" />{busy ? t("common.sending") : t("support.send")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
