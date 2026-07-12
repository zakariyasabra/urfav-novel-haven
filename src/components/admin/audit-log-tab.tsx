import { useQuery } from "@tanstack/react-query";
import { fetchAuditLogs } from "@/lib/admin-api";

export function AuditLogTab() {
  const q = useQuery({ queryKey: ["audit-logs"], queryFn: () => fetchAuditLogs(200) });
  return (
    <div className="space-y-2">
      {(q.data ?? []).map(l => (
        <div key={l.id} className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold text-primary">{l.action}</span>
              {l.target_type && <span className="text-muted-foreground"> · {l.target_type}</span>}
              {l.actor?.username && <span className="text-muted-foreground"> · بواسطة @{l.actor.username}</span>}
            </div>
            <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("ar")}</span>
          </div>
          {l.target_id && <div className="mt-1 text-[10px] text-muted-foreground">هدف: {l.target_id}</div>}
          {l.metadata && Object.keys(l.metadata).length > 0 && (
            <pre className="mt-1 overflow-auto rounded bg-background/50 p-2 text-[10px] text-muted-foreground">{JSON.stringify(l.metadata, null, 2)}</pre>
          )}
        </div>
      ))}
      {q.data?.length === 0 && <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">لا توجد سجلات.</div>}
    </div>
  );
}
