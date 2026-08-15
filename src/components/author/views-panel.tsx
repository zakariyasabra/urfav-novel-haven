import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Users, Layers, BookOpen } from "lucide-react";
import { formatViews } from "@/lib/format";
import { fetchCreatorViewsOverview, fetchCreatorNovelViews } from "@/lib/views-api";
import { useT } from "@/i18n/provider";

type Range = 7 | 30 | 90 | 365;

/** Author-facing real views panel: totals + per-novel breakdown from view_events. */
export function AuthorViewsPanel() {
  const t = useT();
  const [range, setRange] = useState<Range>(30);

  const ovr = useQuery({
    queryKey: ["creator-views-overview"],
    queryFn: fetchCreatorViewsOverview,
    staleTime: 60_000,
    retry: false,
  });
  const rows = useQuery({
    queryKey: ["creator-novel-views", range],
    queryFn: () => fetchCreatorNovelViews(range),
    staleTime: 60_000,
    retry: false,
  });

  if (ovr.isError && rows.isError) return null;
  const o = ovr.data;

  return (
    <section className="rounded-2xl border border-border/40 bg-surface/30 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black">
          <Eye className="h-4 w-4 text-primary" />
          {t("aviews.title")}
        </h2>
        <div className="flex flex-wrap items-center gap-1.5">
          {([7, 30, 90, 365] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${range === r ? "border-primary bg-primary/15 text-primary" : "border-border/40 bg-surface/40 hover:border-primary/40"}`}
            >
              {t(`dash.range.${r}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<Eye />} label={t("aviews.total")} value={o?.views_total} />
        <Stat icon={<Layers />} label={t("aviews.chapters")} value={o?.chapter_views} />
        <Stat icon={<Users />} label={t("aviews.visitors")} value={o?.visitors_total} />
        <Stat icon={<BookOpen />} label={t("aviews.d30")} value={o?.views_30d} />
      </div>

      <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border/30">
        <table className="w-full text-start text-xs">
          <thead className="sticky top-0 bg-surface/90 text-muted-foreground backdrop-blur">
            <tr>
              <th className="p-2 text-start font-semibold">{t("aviews.novel")}</th>
              <th className="p-2 text-start font-semibold">{t("aviews.period")}</th>
              <th className="p-2 text-start font-semibold">{t("aviews.chapters")}</th>
              <th className="p-2 text-start font-semibold">{t("aviews.visitors")}</th>
              <th className="p-2 text-start font-semibold">{t("aviews.all")}</th>
            </tr>
          </thead>
          <tbody>
            {(rows.data ?? []).map((r) => (
              <tr key={r.novel_id} className="border-t border-border/20">
                <td className="max-w-[220px] truncate p-2 font-semibold">{r.title}</td>
                <td className="p-2 tabular-nums">{formatViews(r.views_period)}</td>
                <td className="p-2 tabular-nums">{formatViews(r.chapter_views)}</td>
                <td className="p-2 tabular-nums">{formatViews(r.visitors)}</td>
                <td className="p-2 tabular-nums">{formatViews(r.views_total)}</td>
              </tr>
            ))}
            {(rows.data ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-muted-foreground">
                  {t("aviews.empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-surface/40 p-2.5">
      <div className="mb-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="text-primary [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
        {label}
      </div>
      <div className="text-lg font-black tabular-nums">{formatViews(value ?? 0)}</div>
    </div>
  );
}
