import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Trophy, Search } from "lucide-react";

import { gmLeaderboard, LEADERBOARD_METRICS, type GmLeaderRow } from "@/lib/gamification-api";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  component: LeaderboardPage,
  head: () => ({ meta: [{ title: "لوحة الصدارة — FAVNOL" }, { name: "description", content: "أبطال القراءة والكتابة على FAVNOL" }] }),
});

type Period = "all_time" | "weekly" | "monthly";
const PERIODS: Array<{ code: Period; label: string }> = [
  { code: "weekly",   label: "أسبوعياً" },
  { code: "monthly",  label: "شهرياً" },
  { code: "all_time", label: "الكل" },
];

// Metrics that only support all_time (activity-based)
const ALLTIME_ONLY = new Set(["chapters", "minutes", "completed", "achievements", "streak"]);

function LeaderboardPage() {
  const [metric, setMetric] = useState<string>("xp");
  const [period, setPeriod] = useState<Period>("all_time");
  const [rows, setRows] = useState<GmLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 20;

  useEffect(() => {
    if (ALLTIME_ONLY.has(metric) && period !== "all_time") setPeriod("all_time");
  }, [metric, period]);

  useEffect(() => {
    setLoading(true);
    setPage(1);
    void gmLeaderboard(metric as "xp" | "coins", period, 200).then((r) => { setRows(r); setLoading(false); });
  }, [metric, period]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.display_name ?? "").toLowerCase().includes(q) ||
      (r.username ?? "").toLowerCase().includes(q)
    );
  }, [rows, query]);

  const paged = filtered.slice((page - 1) * perPage, page * perPage);
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const metricLabel = LEADERBOARD_METRICS.find((m) => m.code === metric)?.label_ar ?? metric;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-2 flex items-center gap-2 text-2xl font-black">
        <Trophy className="h-7 w-7 text-primary" /> لوحة الصدارة
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">أفضل القراء والكتّاب على FAVNOL</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {LEADERBOARD_METRICS.map((m) => (
          <button
            key={m.code}
            onClick={() => setMetric(m.code)}
            className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs transition ${metric === m.code ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
          >
            <span>{m.icon}</span>
            {m.label_ar}
          </button>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => {
          const disabled = ALLTIME_ONLY.has(metric) && p.code !== "all_time";
          return (
            <button
              key={p.code}
              onClick={() => !disabled && setPeriod(p.code)}
              disabled={disabled}
              className={`rounded-full border px-3 py-1 text-xs transition ${period === p.code ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {p.label}
            </button>
          );
        })}
        <div className="relative ms-auto">
          <Search className="pointer-events-none absolute inset-y-0 start-2 my-auto h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="بحث…"
            className="w-40 rounded-full border border-border bg-background ps-7 pe-3 py-1 text-xs sm:w-56"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-muted-foreground">جاري التحميل…</div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">لا توجد بيانات بعد</div>
      ) : (
        <>
          <ol className="space-y-2">
            {paged.map((r) => (
              <li
                key={r.user_id}
                className={`flex items-center gap-3 rounded-xl border p-3 ${r.rank <= 3 ? "border-primary/40 bg-primary/5" : "border-border/40 bg-card/60"}`}
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-black ${
                    r.rank === 1 ? "bg-amber-400 text-black" :
                    r.rank === 2 ? "bg-slate-300 text-black" :
                    r.rank === 3 ? "bg-orange-400 text-black" :
                    "bg-muted text-foreground"
                  }`}
                >
                  {r.rank}
                </span>
                {r.avatar_url ? (
                  <img src={r.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-muted" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-bold">{r.display_name ?? r.username ?? "مستخدم"}</div>
                  {r.username ? <div className="text-xs text-muted-foreground">@{r.username}</div> : null}
                </div>
                <div className="text-sm font-bold text-primary">
                  {r.score.toLocaleString()} <span className="text-[10px] text-muted-foreground">{metricLabel}</span>
                </div>
              </li>
            ))}
          </ol>

          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40"
              >السابق</button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-md border border-border px-3 py-1 text-xs disabled:opacity-40"
              >التالي</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
