import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { fetchAuditLogs } from "@/lib/admin-api";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv } from "@/lib/csv";
import { AdminListSkeleton, EmptyState } from "@/components/admin/list-skeleton";
import { useT } from "@/i18n/provider";

const PAGE_SIZE = 50;

export function AuditLogTab() {
  const t = useT();
  const q = useQuery({ queryKey: ["audit-logs"], queryFn: () => fetchAuditLogs(500) });
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<string>("");
  const [page, setPage] = useState(1);
  const debounced = useDebouncedValue(search, 300);

  const actions = useMemo(
    () => Array.from(new Set((q.data ?? []).map((l) => l.action))).sort(),
    [q.data],
  );

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    return (q.data ?? []).filter((l) => {
      if (action && l.action !== action) return false;
      if (!s) return true;
      return (
        l.action.toLowerCase().includes(s) ||
        (l.target_type ?? "").toLowerCase().includes(s) ||
        (l.actor?.username ?? "").toLowerCase().includes(s) ||
        (l.target_id ?? "").toLowerCase().includes(s)
      );
    });
  }, [q.data, debounced, action]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const cur = Math.min(page, totalPages);
  const paged = filtered.slice((cur - 1) * PAGE_SIZE, cur * PAGE_SIZE);

  function exportCsv() {
    downloadCsv("audit-logs", filtered, [
      {
        key: "created_at",
        label: t("audit.csv.date"),
        format: (v) => new Date(v as string).toISOString(),
      },
      { key: "action", label: t("audit.csv.action") },
      { key: "target_type", label: t("audit.csv.targetType") },
      { key: "target_id", label: t("audit.csv.targetId") },
      {
        key: "actor",
        label: t("audit.csv.actor"),
        format: (v) => (v as { username?: string } | null)?.username ?? "",
      },
      {
        key: "metadata",
        label: t("audit.csv.metadata"),
        format: (v) => (v ? JSON.stringify(v) : ""),
      },
    ]);
  }

  return (
    <div>
      <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("audit.searchPh")}
            className="h-10 w-full rounded-md border border-input bg-background/60 px-3 pe-10 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background/60 px-3 text-sm"
        >
          <option value="">{t("audit.allActions")}</option>
          {actions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border/60 bg-surface/60 px-3 text-sm font-semibold hover:border-primary disabled:opacity-50"
        >
          <Download className="h-4 w-4" /> CSV
        </button>
      </div>

      {q.isLoading ? (
        <AdminListSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t("audit.empty.title")} hint={t("audit.empty.hint")} />
      ) : (
        <>
          <div className="space-y-2">
            {paged.map((l) => (
              <div
                key={l.id}
                className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <span className="font-bold text-primary">{l.action}</span>
                    {l.target_type && (
                      <span className="text-muted-foreground"> · {l.target_type}</span>
                    )}
                    {l.actor?.username && (
                      <span className="text-muted-foreground">
                        {t("audit.by", { u: l.actor.username })}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString()}
                  </span>
                </div>
                {l.target_id && (
                  <div className="mt-1 break-all text-[10px] text-muted-foreground">
                    {t("audit.target")} {l.target_id}
                  </div>
                )}
                {l.metadata && Object.keys(l.metadata).length > 0 && (
                  <pre className="mt-1 overflow-auto rounded bg-background/50 p-2 text-[10px] text-muted-foreground">
                    {JSON.stringify(l.metadata, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-muted-foreground">
                {t("audit.countPage", { n: filtered.length, page: cur, total: totalPages })}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={cur <= 1}
                  className="rounded-md border border-border/60 bg-surface/60 px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  {t("audit.prev")}
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={cur >= totalPages}
                  className="rounded-md border border-border/60 bg-surface/60 px-3 py-1.5 font-semibold disabled:opacity-40"
                >
                  {t("audit.next")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
