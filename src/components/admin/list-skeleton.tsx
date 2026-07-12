export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-surface/40 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-full bg-muted/40" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 animate-pulse rounded bg-muted/40" />
              <div className="h-3 w-1/4 animate-pulse rounded bg-muted/30" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-8 w-24 animate-pulse rounded bg-muted/30" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted/30" />
            <div className="h-8 w-24 animate-pulse rounded bg-muted/30" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border/50 bg-surface/30 p-10 text-center">
      {icon && <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">{icon}</div>}
      <div className="text-sm font-bold">{title}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
