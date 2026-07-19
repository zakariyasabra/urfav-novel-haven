import { showError } from "@/lib/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flag, Check, X, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { timeAgoAr } from "@/lib/format";
import { promptDialog } from "@/components/ui/dialog-service";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv } from "@/lib/csv";
import { AdminListSkeleton, EmptyState } from "@/components/admin/list-skeleton";
import { useT } from "@/i18n/provider";

type ReportRow = {
  id: string;
  type: string;
  status: string;
  subject: string | null;
  content: string;
  target_url: string | null;
  reporter_email: string | null;
  reporter_name: string | null;
  admin_notes: string | null;
  created_at: string;
};

export function ReportsTab() {
  const t = useT();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "reviewing" | "resolved" | "">("open");

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const q = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let query = supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      if (filter) query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter(
      (r) =>
        r.type.toLowerCase().includes(s) ||
        (r.subject ?? "").toLowerCase().includes(s) ||
        (r.content ?? "").toLowerCase().includes(s) ||
        (r.reporter_email ?? "").toLowerCase().includes(s) ||
        (r.reporter_name ?? "").toLowerCase().includes(s),
    );
  }, [q.data, debounced]);

  function exportCsv() {
    downloadCsv("reports", filtered, [
      {
        key: "created_at",
        label: t("reportsT.csv.date"),
        format: (v) => new Date(v as string).toISOString(),
      },
      { key: "type", label: t("reportsT.csv.type") },
      { key: "status", label: t("reportsT.csv.status") },
      { key: "subject", label: t("reportsT.csv.subject") },
      { key: "content", label: t("reportsT.csv.content") },
      { key: "target_url", label: t("reportsT.csv.url") },
      { key: "reporter_email", label: t("reportsT.csv.reporterEmail") },
      { key: "reporter_name", label: t("reportsT.csv.reporterName") },
      { key: "admin_notes", label: t("reportsT.csv.notes") },
    ]);
  }

  async function setStatus(id: string, status: string) {
    const note =
      status === "resolved"
        ? ((await promptDialog({ title: t("reportsT.notePrompt"), multiline: true })) ?? "")
        : "";
    const { error } = await supabase
      .from("reports")
      .update({ status, admin_notes: note || null })
      .eq("id", id);
    if (error) return showError(error);
    toast.success(t("reportsT.updated"));
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  function filterLabel(s: "open" | "reviewing" | "resolved" | "") {
    if (s === "") return t("reportsT.filter.all");
    if (s === "open") return t("reportsT.filter.open");
    if (s === "reviewing") return t("reportsT.filter.reviewing");
    return t("reportsT.filter.resolved");
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(["open", "reviewing", "resolved", ""] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}
          >
            {filterLabel(s)}
          </button>
        ))}
        <div className="ms-auto flex flex-1 gap-2 sm:flex-none">
          <div className="relative flex-1 sm:w-64">
            <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("reportsT.searchPh")}
              className="h-9 w-full rounded-md border border-input bg-background/60 px-3 pe-9 text-sm outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border/60 bg-surface/60 px-3 text-xs font-semibold hover:border-primary disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" /> CSV
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <AdminListSkeleton rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={t("reportsT.empty")}
          hint={debounced ? t("reportsT.trySearch") : undefined}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-xl border border-border/40 bg-surface/40 p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Flag className="h-4 w-4 text-destructive" />
                  <span>{r.type}</span>
                  {r.subject && <span className="text-muted-foreground">— {r.subject}</span>}
                </div>
                <span className="text-xs text-muted-foreground">{timeAgoAr(r.created_at)}</span>
              </div>
              <p className="mb-2 whitespace-pre-wrap text-sm text-foreground/85">{r.content}</p>
              {r.target_url &&
                (/^https?:\/\//i.test(r.target_url) ? (
                  <a
                    href={r.target_url}
                    className="mb-2 block break-all text-xs text-primary underline"
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    {r.target_url}
                  </a>
                ) : (
                  <div className="mb-2 block break-all text-xs text-muted-foreground">
                    {r.target_url}
                  </div>
                ))}
              {(r.reporter_name || r.reporter_email) && (
                <div className="mb-2 text-xs text-muted-foreground">
                  {t("reportsT.from")} {r.reporter_name ?? "—"}{" "}
                  {r.reporter_email && `<${r.reporter_email}>`}
                </div>
              )}
              {r.admin_notes && (
                <div className="mb-2 rounded bg-background/60 p-2 text-xs">📝 {r.admin_notes}</div>
              )}
              {r.status !== "resolved" && (
                <div className="flex gap-2">
                  {r.status === "open" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setStatus(r.id, "reviewing")}
                    >
                      {t("reportsT.markReview")}
                    </Button>
                  )}
                  <Button size="sm" onClick={() => setStatus(r.id, "resolved")}>
                    <Check className="me-1 h-3 w-3" />
                    {t("reportsT.resolve")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setStatus(r.id, "dismissed")}
                  >
                    <X className="me-1 h-3 w-3" />
                    {t("reportsT.dismiss")}
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
