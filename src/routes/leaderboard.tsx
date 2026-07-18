import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, Coins, Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/site/layout";
import { gmLeaderboard, type GmLeaderRow } from "@/lib/gamification-api";

export const Route = createFileRoute("/leaderboard")({
  ssr: false,
  component: LeaderboardPage,
  head: () => ({ meta: [{ title: "لوحة الصدارة — FAVNOL" }, { name: "description", content: "أبطال القراءة والكتابة على FAVNOL" }] }),
});

type Metric = "xp" | "coins";
type Period = "all_time" | "weekly" | "monthly";

function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>("xp");
  const [period, setPeriod] = useState<Period>("all_time");
  const [rows, setRows] = useState<GmLeaderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    void gmLeaderboard(metric, period, 100).then((r) => { setRows(r); setLoading(false); });
  }, [metric, period]);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-black">
          <Trophy className="h-7 w-7 text-primary" /> لوحة الصدارة
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">أفضل القراء والكتّاب على FAVNOL</p>

        <div className="mb-6 flex flex-wrap gap-2">
          {(["xp", "coins"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm transition ${metric === m ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-muted"}`}
            >
              {m === "xp" ? <Sparkles className="h-3.5 w-3.5" /> : <Coins className="h-3.5 w-3.5" />}
              {m === "xp" ? "XP" : "العملات"}
            </button>
          ))}
          <span className="mx-2 w-px bg-border" />
          {(["weekly", "monthly", "all_time"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${period === p ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
            >
              {p === "weekly" ? "أسبوعياً" : p === "monthly" ? "شهرياً" : "الكل"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">جاري التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">لا توجد بيانات بعد</div>
        ) : (
          <ol className="space-y-2">
            {rows.map((r) => (
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
                  <div className="text-sm font-bold">{r.display_name ?? r.username}</div>
                  {r.username ? <div className="text-xs text-muted-foreground">@{r.username}</div> : null}
                </div>
                <div className="text-sm font-bold text-primary">
                  {r.score.toLocaleString()} {metric === "xp" ? "XP" : "🪙"}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </SiteLayout>
  );
}
