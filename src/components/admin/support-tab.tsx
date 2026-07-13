import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useT, usePreferences } from "@/i18n/provider";
import { fetchAllTickets, updateTicket, type TicketStatus, type TicketPriority } from "@/lib/support-api";
import { showError } from "@/lib/errors";

const STATUSES: (TicketStatus | "")[] = ["", "new", "assigned", "in_progress", "waiting_user", "resolved", "closed", "rejected"];
const PRIORITIES: TicketPriority[] = ["low", "normal", "high", "urgent"];

export function SupportTab() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const qc = useQueryClient();
  const [status, setStatus] = useState<TicketStatus | "">("");
  const q = useQuery({
    queryKey: ["admin-tickets", status],
    queryFn: () => fetchAllTickets(status ? { status: status as TicketStatus } : undefined),
  });

  async function patch(id: string, p: { status?: TicketStatus; priority?: TicketPriority }) {
    try {
      await updateTicket(id, p);
      toast.success(t("common.saved"));
      qc.invalidateQueries({ queryKey: ["admin-tickets"] });
    } catch (e) { showError(e); }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar">
        {STATUSES.map((s) => (
          <button key={s || "all"} onClick={() => setStatus(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              status === s ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"
            }`}>
            {s ? t(`support.status.${s}`) : t("fr.filter.all")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(q.data ?? []).map((tk) => (
          <div key={tk.id} className="rounded-xl border border-border/40 bg-surface/40 p-4">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <Link to="/support/$id" params={{ id: tk.id }} className="truncate font-bold hover:text-primary">{tk.subject}</Link>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {t(`support.cat.${tk.category}`)} · {new Date(tk.created_at).toLocaleString(locale)}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <select value={tk.status} onChange={(e) => patch(tk.id, { status: e.target.value as TicketStatus })}
                  className="h-8 rounded-md border border-input bg-background/60 px-2 text-xs">
                  {(STATUSES.filter(Boolean) as TicketStatus[]).map((s) => (
                    <option key={s} value={s}>{t(`support.status.${s}`)}</option>
                  ))}
                </select>
                <select value={tk.priority} onChange={(e) => patch(tk.id, { priority: e.target.value as TicketPriority })}
                  className="h-8 rounded-md border border-input bg-background/60 px-2 text-xs">
                  {PRIORITIES.map((p) => <option key={p} value={p}>{t(`support.prio.${p}`)}</option>)}
                </select>
              </div>
            </div>
            <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{tk.body}</p>
          </div>
        ))}
        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            {t("support.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
