// Creator Studio — advanced author-only panels.
// Reuses design tokens from analytics-panel; no new UI kit.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Users,
  Eye,
  Heart,
  Coins,
  Calendar as CalIcon,
  FileText,
  Clock,
  Star,
  History,
  Crown,
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { confirmDialog } from "@/components/ui/dialog-service";
import { showError } from "@/lib/errors";
import { useT, usePreferences } from "@/i18n/provider";
import { useTimeAgo, formatViews } from "@/lib/format";
import {
  fetchCreatorKpis,
  fetchGrowthTimeseries,
  fetchReadingHeatmap,
  fetchTopReaders,
  fetchTopCountries,
  fetchReadingSources,
  fetchCompletionRates,
  fetchPublishingCalendar,
  fetchChapterVersions,
  restoreChapterVersion,
  type CalendarChapter,
} from "@/lib/creator-studio-api";

type Item = { icon: React.ReactNode; label: string; value: string | number };

function Grid({ items }: { items: Item[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((it, i) => (
        <div key={i} className="rounded-xl border border-border/40 bg-surface/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-primary [&>svg]:h-3.5 [&>svg]:w-3.5">{it.icon}</span>
            {it.label}
          </div>
          <div className="text-xl font-black tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border/40 bg-surface/40 p-4">
      <div className="mb-3 text-sm font-bold text-muted-foreground">{title}</div>
      {children}
    </section>
  );
}

function Empty() {
  const t = useT();
  return <div className="py-6 text-center text-xs text-muted-foreground">{t("studio.noData")}</div>;
}

// ── KPI overview ───────────────────────────────────────────────────────────
export function CreatorKpisPanel() {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["creator-kpis"],
    queryFn: fetchCreatorKpis,
    staleTime: 60_000,
  });
  if (isLoading || !data) return <Empty />;
  const items: Item[] = [
    { icon: <Users />, label: t("studio.kpi.readers"), value: formatViews(data.unique_readers) },
    { icon: <Eye />, label: t("studio.kpi.reads7"), value: formatViews(data.reads_7d) },
    { icon: <Eye />, label: t("studio.kpi.reads30"), value: formatViews(data.reads_30d) },
    { icon: <Users />, label: t("studio.kpi.followers"), value: formatViews(data.followers) },
    { icon: <Heart />, label: t("studio.kpi.favorites"), value: formatViews(data.favorites) },
    { icon: <Coins />, label: t("studio.kpi.coins30"), value: formatViews(data.coins_30d) },
    {
      icon: <Star />,
      label: t("an.n.rating"),
      value: `${data.rating_avg.toFixed(2)} (${data.rating_count})`,
    },
    { icon: <Clock />, label: t("studio.kpi.scheduled"), value: data.chapters_scheduled },
    { icon: <FileText />, label: t("studio.kpi.drafts"), value: data.chapters_draft },
  ];
  return <Grid items={items} />;
}

// ── Growth chart ───────────────────────────────────────────────────────────
export function CreatorGrowthChart({ days = 30 }: { days?: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["creator-growth", days],
    queryFn: () => fetchGrowthTimeseries(days),
    staleTime: 60_000,
  });
  if (isLoading || !data?.length) return <Empty />;
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
          <XAxis dataKey="day" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
            }}
          />
          <Line
            type="monotone"
            dataKey="reads"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="new_favorites"
            stroke="#e11d48"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="new_followers"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Heatmap (dow x hour) ───────────────────────────────────────────────────
export function CreatorHeatmap({ novelId, days }: { novelId: string | null; days: number }) {
  const t = useT();
  const { lang } = usePreferences();
  const { data, isLoading } = useQuery({
    queryKey: ["creator-heatmap", novelId, days],
    queryFn: () => fetchReadingHeatmap(novelId, days),
    staleTime: 60_000,
  });
  const grid = useMemo(() => {
    const g: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    (data ?? []).forEach((c) => {
      if (c.dow >= 0 && c.dow < 7 && c.hour >= 0 && c.hour < 24) g[c.dow][c.hour] = c.reads;
    });
    return g;
  }, [data]);
  const max = useMemo(() => Math.max(1, ...grid.flat()), [grid]);
  if (isLoading) return <Empty />;
  const daysAr = ["أحد", "اثن", "ثلث", "أرب", "خمس", "جمع", "سبت"];
  const daysEn = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayLabels = lang === "en" ? daysEn : daysAr;
  const total = grid.flat().reduce((a, b) => a + b, 0);
  if (total === 0) return <Empty />;

  return (
    <div className="overflow-x-auto">
      <div className="inline-block min-w-full">
        <div className="flex gap-1 pb-1 ps-8 text-[9px] text-muted-foreground">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="w-4 text-center tabular-nums">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {grid.map((row, dow) => (
          <div key={dow} className="flex items-center gap-1 py-0.5">
            <div className="w-7 text-[10px] text-muted-foreground">{dayLabels[dow]}</div>
            {row.map((v, h) => {
              const intensity = v / max;
              return (
                <div
                  key={h}
                  title={`${dayLabels[dow]} ${h}:00 — ${v} ${t("studio.reads")}`}
                  className="h-4 w-4 rounded-sm"
                  style={{
                    background:
                      v === 0
                        ? "hsl(var(--surface))"
                        : `color-mix(in oklab, hsl(var(--primary)) ${Math.round(intensity * 100)}%, transparent)`,
                    border: "1px solid hsl(var(--border) / 0.4)",
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Top readers ────────────────────────────────────────────────────────────
export function CreatorTopReaders({ novelId, days }: { novelId: string | null; days: number }) {
  const t = useT();
  const timeAgo = useTimeAgo();
  const { data, isLoading } = useQuery({
    queryKey: ["creator-top-readers", novelId, days],
    queryFn: () => fetchTopReaders(novelId, 10, days),
    staleTime: 60_000,
  });
  if (isLoading) return <Empty />;
  if (!data?.length) return <Empty />;
  return (
    <ul className="divide-y divide-border/40">
      {data.map((r) => {
        const name = r.display_name ?? r.username ?? t("author.readerFallback");
        return (
          <li
            key={r.user_id}
            className="grid grid-cols-[32px_minmax(0,1fr)_auto_auto] items-center gap-3 py-2 text-sm"
          >
            <img
              src={r.avatar_url ?? "/placeholder.svg"}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1 truncate font-bold">
                {name}
                {r.is_vip && <Crown className="h-3 w-3 text-primary" />}
              </div>
              <div className="text-xs text-muted-foreground">{timeAgo(r.last_read_at)}</div>
            </div>
            <div className="shrink-0 text-xs text-muted-foreground">{t("studio.chapters")}</div>
            <div className="shrink-0 font-black tabular-nums">{r.chapters_read}</div>
          </li>
        );
      })}
    </ul>
  );
}

// ── Top countries ──────────────────────────────────────────────────────────
export function CreatorTopCountries({ novelId, days }: { novelId: string | null; days: number }) {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["creator-top-countries", novelId, days],
    queryFn: () => fetchTopCountries(novelId, 10, days),
    staleTime: 60_000,
  });
  if (isLoading) return <Empty />;
  if (!data?.length) return <Empty />;
  return (
    <ul className="divide-y divide-border/40">
      {data.map((c) => (
        <li
          key={c.country_code}
          className="grid grid-cols-[24px_minmax(0,1fr)_auto_auto] items-center gap-3 py-2 text-sm"
        >
          <Globe2 className="h-4 w-4 text-primary" />
          <div className="font-bold">{c.country_code === "--" ? "—" : c.country_code}</div>
          <div className="shrink-0 text-xs text-muted-foreground">{t("studio.readersCol")}</div>
          <div className="shrink-0 font-black tabular-nums">{c.readers}</div>
        </li>
      ))}
    </ul>
  );
}

// ── Reading sources donut ──────────────────────────────────────────────────
const SOURCE_COLOURS: Record<string, string> = {
  free: "hsl(var(--primary))",
  vip: "#a855f7",
  coin_unlock: "#22c55e",
};
export function CreatorReadingSources({ novelId, days }: { novelId: string | null; days: number }) {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["creator-sources", novelId, days],
    queryFn: () => fetchReadingSources(novelId, days),
    staleTime: 60_000,
  });
  if (isLoading) return <Empty />;
  if (!data?.length) return <Empty />;
  const shaped = data.map((d) => ({
    name: t(`studio.source.${d.source}`),
    value: d.reads,
    key: d.source,
  }));
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={shaped}
            dataKey="value"
            nameKey="name"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
          >
            {shaped.map((s) => (
              <Cell key={s.key} fill={SOURCE_COLOURS[s.key] ?? "#888"} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--surface))",
              border: "1px solid hsl(var(--border))",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Completion rates table ────────────────────────────────────────────────
export function CreatorCompletionRates() {
  const t = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["creator-completion"],
    queryFn: () => fetchCompletionRates(null),
    staleTime: 60_000,
  });
  if (isLoading) return <Empty />;
  if (!data?.length) return <Empty />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-muted-foreground">
            <th className="py-1 text-start font-normal">{t("an.n.chViews")}</th>
            <th className="py-1 text-start font-normal">{t("studio.readersCol")}</th>
            <th className="py-1 text-start font-normal">{t("studio.completionPct")}</th>
            <th className="py-1 text-start font-normal">{t("studio.avgProgress")}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.novel_id} className="border-t border-border/30">
              <td className="py-2 pe-2 font-bold">{r.title}</td>
              <td className="py-2 tabular-nums">{r.total_readers}</td>
              <td className="py-2 tabular-nums">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-surface">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${Math.min(100, r.completion_pct)}%` }}
                    />
                  </div>
                  <span>{r.completion_pct}%</span>
                </div>
              </td>
              <td className="py-2 tabular-nums">{r.avg_progress}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Publishing calendar ────────────────────────────────────────────────────
function statusBadge(t: (k: string) => string, s: CalendarChapter["status"]) {
  const map = {
    published: { label: t("studio.published"), cls: "bg-emerald-500/10 text-emerald-500" },
    scheduled: { label: t("studio.scheduled"), cls: "bg-amber-500/10 text-amber-500" },
    draft: { label: t("studio.draft"), cls: "bg-muted text-muted-foreground" },
  } as const;
  const m = map[s] ?? map.draft;
  return (
    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${m.cls}`}>{m.label}</span>
  );
}
export function CreatorPublishingCalendar() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const { data, isLoading } = useQuery({
    queryKey: ["creator-calendar"],
    queryFn: () => fetchPublishingCalendar(30, 60),
    staleTime: 60_000,
  });
  if (isLoading) return <Empty />;
  if (!data?.length) return <Empty />;
  const upcoming = data.filter((c) => c.status === "scheduled" || c.status === "draft");
  const past = data.filter((c) => c.status === "published");
  const fmt = (d: string | null) =>
    d ? new Date(d).toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" }) : "—";
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 text-xs font-bold text-muted-foreground">{t("studio.upcoming")}</div>
        {upcoming.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {upcoming.map((c) => (
              <li
                key={c.chapter_id}
                className="rounded-lg border border-border/40 bg-background/30 p-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate font-bold">
                    {c.novel_title} — #{c.chapter_number}
                  </div>
                  {statusBadge(t, c.status)}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{c.title}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalIcon className="h-3 w-3" />
                  {fmt(c.scheduled_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <div className="mb-2 text-xs font-bold text-muted-foreground">{t("studio.past")}</div>
        {past.length === 0 ? (
          <Empty />
        ) : (
          <ul className="space-y-2">
            {past.slice(0, 20).map((c) => (
              <li
                key={c.chapter_id}
                className="rounded-lg border border-border/40 bg-background/30 p-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 truncate font-bold">
                    {c.novel_title} — #{c.chapter_number}
                  </div>
                  {statusBadge(t, c.status)}
                </div>
                <div className="mt-1 truncate text-xs text-muted-foreground">{c.title}</div>
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <CalIcon className="h-3 w-3" />
                  {fmt(c.published_at)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Chapter version history (used inside the chapter editor route) ────────
export function ChapterVersionHistory({ chapterId }: { chapterId: string }) {
  const t = useT();
  const timeAgo = useTimeAgo();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["chapter-versions", chapterId],
    queryFn: () => fetchChapterVersions(chapterId),
    staleTime: 30_000,
  });
  if (isLoading) return <Empty />;
  if (!data?.length) return <Empty />;
  async function restore(id: string) {
    if (
      !(await confirmDialog({
        title: t("studio.confirmRestore"),
        confirmLabel: t("studio.restore"),
      }))
    )
      return;
    try {
      await restoreChapterVersion(id);
      toast.success(t("studio.restored"));
      qc.invalidateQueries({ queryKey: ["chapter-versions", chapterId] });
      qc.invalidateQueries({ queryKey: ["chapter-edit", chapterId] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <ul className="divide-y divide-border/40">
      {data.map((v) => (
        <li
          key={v.id}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-2 text-sm"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface">
            <History className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="truncate font-bold">
              {t("studio.version")} #{v.version_no}
              {v.editor_name ? ` · ${v.editor_name}` : ""}
            </div>
            <div className="text-xs text-muted-foreground">
              {timeAgo(v.created_at)} · {v.content_len_ar + v.content_len_en} {t("studio.chars")}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={() => restore(v.id)}>
            {t("studio.restore")}
          </Button>
        </li>
      ))}
    </ul>
  );
}

// ── Filter bar ─────────────────────────────────────────────────────────────
export function StudioFilters({
  novels,
  novelId,
  onNovel,
  days,
  onDays,
}: {
  novels: Array<{ id: string; title: string }>;
  novelId: string | null;
  onNovel: (id: string | null) => void;
  days: number;
  onDays: (n: number) => void;
}) {
  const t = useT();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted-foreground">{t("studio.novelPicker")}:</label>
      <select
        value={novelId ?? ""}
        onChange={(e) => onNovel(e.target.value || null)}
        className="rounded-md border border-border/60 bg-background/40 px-2 py-1 text-sm"
      >
        <option value="">{t("studio.allNovels")}</option>
        {novels.map((n) => (
          <option key={n.id} value={n.id}>
            {n.title}
          </option>
        ))}
      </select>
      <div className="inline-flex overflow-hidden rounded-md border border-border/60">
        {[7, 30, 90].map((d) => (
          <button
            key={d}
            onClick={() => onDays(d)}
            className={`px-2 py-1 text-xs font-bold ${
              days === d ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            {t(`studio.range.${d}` as "studio.range.7" | "studio.range.30" | "studio.range.90")}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CreatorStudio({ novels }: { novels: Array<{ id: string; title: string }> }) {
  const t = useT();
  const [novelId, setNovelId] = useState<string | null>(null);
  const [days, setDays] = useState(30);
  return (
    <div className="space-y-4">
      <Card title={t("studio.overview")}>
        <CreatorKpisPanel />
      </Card>

      <StudioFilters
        novels={novels}
        novelId={novelId}
        onNovel={setNovelId}
        days={days}
        onDays={setDays}
      />

      <Card title={t("studio.growth")}>
        <CreatorGrowthChart days={days} />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("studio.heatmap")}>
          <CreatorHeatmap novelId={novelId} days={days} />
        </Card>
        <Card title={t("studio.sources")}>
          <CreatorReadingSources novelId={novelId} days={days} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t("studio.readers")}>
          <CreatorTopReaders novelId={novelId} days={days} />
        </Card>
        <Card title={t("studio.countries")}>
          <CreatorTopCountries novelId={novelId} days={days} />
        </Card>
      </div>

      <Card title={t("studio.completion")}>
        <CreatorCompletionRates />
      </Card>

      <Card title={t("studio.calendar")}>
        <CreatorPublishingCalendar />
      </Card>
    </div>
  );
}
