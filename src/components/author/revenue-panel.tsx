// Batch 7D — Author Revenue Panel (dashboard drop-in)
// Reuses existing coin/earnings model via RPCs. No new visual system.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Coins, Gift, Wallet, TrendingUp, BookOpen, FileText } from "lucide-react";
import {
  getRevenueSummary,
  getRevenueTimeseries,
  getTopNovels,
  getTopChapters,
  type RevenueBucket,
  type RevenueTimePoint,
  type TopNovelRow,
  type TopChapterRow,
} from "@/lib/author-monetization-api";
import { coverUrl } from "@/lib/covers";
import { useT, usePreferences } from "@/i18n/provider";

const BUCKET_DAYS: Record<RevenueBucket, number> = { day: 30, week: 84, month: 365 };

export function AuthorRevenuePanel() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const [bucket, setBucket] = useState<RevenueBucket>("day");

  const summaryQ = useQuery({ queryKey: ["author-rev-summary"], queryFn: getRevenueSummary });
  const seriesQ = useQuery({
    queryKey: ["author-rev-series", bucket],
    queryFn: () => getRevenueTimeseries(bucket, BUCKET_DAYS[bucket]),
  });
  const topNovelsQ = useQuery({
    queryKey: ["author-top-novels"],
    queryFn: () => getTopNovels(5, 90),
  });
  const topChaptersQ = useQuery({
    queryKey: ["author-top-chapters"],
    queryFn: () => getTopChapters(5, 90),
  });

  const s = summaryQ.data;
  const fmt = (n: number) => n.toLocaleString(locale);

  return (
    <section className="mb-6">
      <div className="mb-3 text-sm font-bold text-muted-foreground">{t("rev.title")}</div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={Wallet} label={t("rev.available")} value={fmt(s?.available ?? 0)} accent />
        <StatCard icon={TrendingUp} label={t("rev.thisMonth")} value={fmt(s?.this_month ?? 0)} />
        <StatCard icon={Gift} label={t("rev.inFlight")} value={fmt(s?.in_flight ?? 0)} />
        <StatCard icon={Coins} label={t("rev.lifetime")} value={fmt(s?.lifetime ?? 0)} />
      </div>

      <div className="mt-4 rounded-2xl border border-border/40 bg-surface/40 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-bold">{t("rev.chart")}</div>
          <div className="flex gap-1">
            {(["day", "week", "month"] as RevenueBucket[]).map((b) => (
              <button
                key={b}
                onClick={() => setBucket(b)}
                className={`rounded-md px-2 py-1 text-xs font-bold ${bucket === b ? "bg-primary text-primary-foreground" : "bg-background/50 text-muted-foreground hover:text-foreground"}`}
              >
                {t(`rev.bucket.${b}`)}
              </button>
            ))}
          </div>
        </div>
        <RevenueBars data={seriesQ.data ?? []} locale={locale} />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <TopNovelsCard rows={topNovelsQ.data ?? []} locale={locale} label={t("rev.topNovels")} />
        <TopChaptersCard
          rows={topChaptersQ.data ?? []}
          locale={locale}
          label={t("rev.topChapters")}
        />
      </div>
    </section>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-3 ${accent ? "border-primary/40 bg-primary/5" : "border-border/40 bg-surface/40"}`}
    >
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <div className="text-xl font-black tabular-nums">{value}</div>
    </div>
  );
}

function RevenueBars({ data, locale }: { data: RevenueTimePoint[]; locale: string }) {
  const max = useMemo(() => Math.max(1, ...data.map((d) => d.coins)), [data]);
  if (data.length === 0)
    return <div className="py-8 text-center text-sm text-muted-foreground">—</div>;
  return (
    <div className="flex h-32 items-end gap-1">
      {data.map((d) => {
        const total = Math.max(0, d.coins);
        const h = (total / max) * 100;
        const tipShare = total > 0 ? (d.tip_coins / total) * h : 0;
        const unlockShare = Math.max(0, h - tipShare);
        const label = new Date(d.bucket_start).toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
        });
        return (
          <div
            key={d.bucket_start}
            className="group relative flex flex-1 flex-col justify-end"
            title={`${label} · ${d.coins} (${d.tip_coins} tips, ${d.unlock_coins} unlocks)`}
          >
            <div
              className="flex flex-col overflow-hidden rounded-t"
              style={{ height: `${Math.max(2, h)}%` }}
            >
              <div className="w-full bg-amber-400/70" style={{ height: `${tipShare}%` }} />
              <div className="w-full bg-primary" style={{ height: `${unlockShare}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopNovelsCard({
  rows,
  locale,
  label,
}: {
  rows: TopNovelRow[];
  locale: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <BookOpen className="h-4 w-4 text-primary" />
        {label}
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">—</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.novel_id}>
              <Link
                to="/novels/$slug"
                params={{ slug: r.slug }}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-background/40"
              >
                <img
                  src={coverUrl(r.cover_url)}
                  alt=""
                  className="h-12 w-9 shrink-0 rounded object-cover"
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {r.tip_coins > 0 && <span>💝 {r.tip_coins.toLocaleString(locale)}</span>}
                    {r.unlock_coins > 0 && (
                      <span className="ms-2">🔓 {r.unlock_coins.toLocaleString(locale)}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-sm font-black text-primary tabular-nums">
                  {r.coins.toLocaleString(locale)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TopChaptersCard({
  rows,
  locale,
  label,
}: {
  rows: TopChapterRow[];
  locale: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-bold">
        <FileText className="h-4 w-4 text-primary" />
        {label}
      </div>
      {rows.length === 0 ? (
        <div className="py-6 text-center text-sm text-muted-foreground">—</div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.chapter_id}>
              <Link
                to="/novels/$slug/$chapter"
                params={{ slug: r.novel_slug, chapter: String(r.chapter_number) }}
                className="flex items-center gap-3 rounded-lg p-2 hover:bg-background/40"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-black text-primary">
                  #{r.chapter_number}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold">
                    {r.title || `#${r.chapter_number}`}
                  </div>
                  <div className="truncate text-[11px] text-muted-foreground">{r.novel_title}</div>
                </div>
                <div className="shrink-0 text-sm font-black text-primary tabular-nums">
                  {r.coins.toLocaleString(locale)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
