import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { useT, usePreferences } from "@/i18n/provider";
import { showError } from "@/lib/errors";
import { fetchFeatureRequests, updateFeatureRequest, type FRStatus } from "@/lib/feature-requests-api";
import { Button } from "@/components/ui/button";
import { promptDialog } from "@/components/ui/dialog-service";

const STATUSES: FRStatus[] = ["submitted", "planned", "accepted", "in_progress", "completed", "rejected"];

export function FeatureRequestsTab() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const qc = useQueryClient();
  const [filter, setFilter] = useState<FRStatus | "all">("all");
  const q = useQuery({
    queryKey: ["admin-fr", filter],
    queryFn: () => fetchFeatureRequests(filter === "all" ? undefined : filter),
  });

  async function updateStatus(id: string, status: FRStatus) {
    try {
      await updateFeatureRequest(id, { status });
      toast.success(t("common.saved"));
      qc.invalidateQueries({ queryKey: ["admin-fr"] });
    } catch (e) { showError(e); }
  }

  async function addNote(id: string) {
    const note = await promptDialog({ title: t("fr.adminNote"), multiline: true });
    if (note == null) return;
    try {
      await updateFeatureRequest(id, { admin_note: note });
      qc.invalidateQueries({ queryKey: ["admin-fr"] });
    } catch (e) { showError(e); }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar">
        <button onClick={() => setFilter("all")}
          className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === "all" ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
          {t("fr.filter.all")}
        </button>
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${filter === s ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
            {t(`fr.status.${s}`)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(q.data ?? []).map((r) => (
          <div key={r.id} className="rounded-xl border border-border/40 bg-surface/40 p-4">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{r.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {r.votes_count} {t("fr.votes")} · {new Date(r.created_at).toLocaleString(locale)}
                </div>
              </div>
              <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value as FRStatus)}
                className="h-8 shrink-0 rounded-md border border-input bg-background/60 px-2 text-xs">
                {STATUSES.map((s) => <option key={s} value={s}>{t(`fr.status.${s}`)}</option>)}
              </select>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p>
            {r.admin_note && (
              <div className="mt-2 rounded-md bg-primary/10 p-2 text-xs text-primary">
                <span className="font-bold">{t("fr.adminNote")}:</span> {r.admin_note}
              </div>
            )}
            <div className="mt-2">
              <Button size="sm" variant="outline" onClick={() => addNote(r.id)}>{t("fr.setNote")}</Button>
            </div>
          </div>
        ))}
        {!q.isLoading && (q.data?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
            {t("fr.empty")}
          </div>
        )}
      </div>
    </div>
  );
}
