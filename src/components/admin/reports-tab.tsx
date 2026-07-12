import { showError } from "@/lib/errors";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Flag, Check, X, Download, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { timeAgoAr } from "@/lib/format";
import { confirmDialog, promptDialog } from "@/components/ui/dialog-service";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { downloadCsv } from "@/lib/csv";
import { AdminListSkeleton, EmptyState } from "@/components/admin/list-skeleton";

type ReportRow = {
  id: string; type: string; status: string; subject: string | null;
  content: string; target_url: string | null; reporter_email: string | null;
  reporter_name: string | null; admin_notes: string | null; created_at: string;
};

export function ReportsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "in_review" | "resolved" | "">("open");

  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);

  const q = useQuery({
    queryKey: ["admin-reports", filter],
    queryFn: async () => {
      let query = supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(300);
      if (filter) query = query.eq("status", filter);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as ReportRow[];
    },
  });

  const filtered = useMemo(() => {
    const s = debounced.trim().toLowerCase();
    if (!s) return q.data ?? [];
    return (q.data ?? []).filter((r) =>
      r.type.toLowerCase().includes(s) ||
      (r.subject ?? "").toLowerCase().includes(s) ||
      (r.content ?? "").toLowerCase().includes(s) ||
      (r.reporter_email ?? "").toLowerCase().includes(s) ||
      (r.reporter_name ?? "").toLowerCase().includes(s)
    );
  }, [q.data, debounced]);

  function exportCsv() {
    downloadCsv("reports", filtered, [
      { key: "created_at", label: "التاريخ", format: (v) => new Date(v as string).toISOString() },
      { key: "type", label: "النوع" },
      { key: "status", label: "الحالة" },
      { key: "subject", label: "الموضوع" },
      { key: "content", label: "المحتوى" },
      { key: "target_url", label: "الرابط" },
      { key: "reporter_email", label: "بريد المبلغ" },
      { key: "reporter_name", label: "اسم المبلغ" },
      { key: "admin_notes", label: "ملاحظات" },
    ]);
  }

  async function setStatus(id: string, status: string) {
    const note = status === "resolved" ? ((await promptDialog({ title: "ملاحظة (اختياري):", multiline: true })) ?? "") : "";
    const { error } = await supabase.from("reports").update({ status, admin_notes: note || null }).eq("id", id);
    if (error) return showError(error);
    toast.success("تم التحديث");
    qc.invalidateQueries({ queryKey: ["admin-reports"] });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["open", "in_review", "resolved", ""] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}>
            {s === "" ? "الكل" : s === "open" ? "مفتوحة" : s === "in_review" ? "قيد المراجعة" : "محلولة"}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(q.data ?? []).map((r) => (
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
            {r.target_url && (/^https?:\/\//i.test(r.target_url)
              ? <a href={r.target_url} className="mb-2 block break-all text-xs text-primary underline" target="_blank" rel="noreferrer noopener">{r.target_url}</a>
              : <div className="mb-2 block break-all text-xs text-muted-foreground">{r.target_url}</div>)}
            {(r.reporter_name || r.reporter_email) && (
              <div className="mb-2 text-xs text-muted-foreground">
                من: {r.reporter_name ?? "—"} {r.reporter_email && `<${r.reporter_email}>`}
              </div>
            )}
            {r.admin_notes && <div className="mb-2 rounded bg-background/60 p-2 text-xs">📝 {r.admin_notes}</div>}
            {r.status !== "resolved" && (
              <div className="flex gap-2">
                {r.status === "open" && (
                  <Button size="sm" variant="outline" onClick={() => setStatus(r.id, "in_review")}>
                    قيد المراجعة
                  </Button>
                )}
                <Button size="sm" onClick={() => setStatus(r.id, "resolved")}>
                  <Check className="me-1 h-3 w-3" />حل
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setStatus(r.id, "dismissed")}>
                  <X className="me-1 h-3 w-3" />رفض
                </Button>
              </div>
            )}
          </div>
        ))}
        {q.data?.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
            لا بلاغات.
          </div>
        )}
      </div>
    </div>
  );
}
