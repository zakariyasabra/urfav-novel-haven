import { useEffect, useState } from "react";
import { BookOpen, Clock, Flame, BookMarked, Trophy, User as UserIcon, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { gmReadingStats, type GmReadingStats } from "@/lib/gamification-api";

function Stat({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-3">
      <div className="mb-1 flex items-center gap-2 text-[11px] text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="text-xl font-black tabular-nums">{value}</div>
      {sub ? <div className="mt-0.5 text-[10px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

function Calendar({ days }: { days: Array<{ day: string; count: number }> }) {
  const map = new Map(days.map((d) => [d.day, d.count]));
  const max = Math.max(1, ...days.map((d) => d.count));
  const cells: Array<{ key: string; iso: string; count: number }> = [];
  const today = new Date();
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const iso = d.toISOString().slice(0, 10);
    cells.push({ key: iso, iso, count: map.get(iso) ?? 0 });
  }
  return (
    <div className="grid grid-flow-col grid-rows-7 gap-1" dir="ltr">
      {cells.map((c) => {
        const intensity = c.count === 0 ? 0 : Math.min(1, c.count / max);
        return (
          <div
            key={c.key}
            title={`${c.iso} — ${c.count}`}
            className="h-3 w-3 rounded-sm"
            style={{
              backgroundColor:
                c.count === 0
                  ? "hsl(var(--muted) / 0.35)"
                  : `hsl(30 95% 55% / ${0.25 + intensity * 0.75})`,
            }}
          />
        );
      })}
    </div>
  );
}

export function ReadingStatsPanel() {
  const [stats, setStats] = useState<GmReadingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    gmReadingStats()
      .then((s) => {
        if (cancelled) return;
        setStats(s);
        setLoading(false);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError((e as { message?: string })?.message ?? "خطأ غير معروف");
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        جاري تحميل الإحصائيات…
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-6 text-center text-sm text-destructive">
        تعذّر تحميل إحصائيات القراءة: {error}
      </div>
    );
  }
  if (!stats) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        لا توجد إحصائيات قراءة بعد. ابدأ بقراءة فصل لتظهر بياناتك هنا.
      </div>
    );
  }

  const hours = Math.floor(stats.total_minutes / 60);
  const minutes = stats.total_minutes % 60;

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <BookOpen className="h-4 w-4 text-primary" /> إحصائيات القراءة
      </h3>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat icon={<BookOpen className="h-3.5 w-3.5" />} label="فصول مقروءة" value={stats.total_chapters_read} />
        <Stat
          icon={<BookMarked className="h-3.5 w-3.5" />}
          label="روايات مكتملة"
          value={stats.completed_novels}
          sub={`من ${stats.novels_read} رواية`}
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label="وقت القراءة"
          value={hours > 0 ? `${hours}س ${minutes}د` : `${minutes}د`}
        />
        <Stat
          icon={<Flame className="h-3.5 w-3.5" />}
          label="التتابع"
          value={stats.current_streak}
          sub={`أطول: ${stats.longest_streak}`}
        />
      </div>

      {stats.favorite_novel || stats.favorite_author || stats.favorite_genre ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {stats.favorite_novel ? (
            <Link
              to="/novels/$slug"
              params={{ slug: stats.favorite_novel.slug }}
              className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3 transition hover:border-primary/40"
            >
              {stats.favorite_novel.cover_url ? (
                <img
                  src={stats.favorite_novel.cover_url}
                  alt=""
                  className="h-14 w-10 rounded object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="h-14 w-10 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground">الرواية المفضلة</div>
                <div className="truncate text-sm font-bold">{stats.favorite_novel.title}</div>
              </div>
            </Link>
          ) : null}
          {stats.favorite_author ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground">الكاتب المفضل</div>
                <div className="truncate text-sm font-bold">{stats.favorite_author}</div>
              </div>
            </div>
          ) : null}
          {stats.favorite_genre ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Tag className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground">التصنيف المفضل</div>
                <div className="truncate text-sm font-bold">{stats.favorite_genre.name}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {stats.monthly.length > 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold">
            <Trophy className="h-3.5 w-3.5 text-primary" /> فصول لكل شهر (آخر ١٢ شهراً)
          </div>
          <div className="h-40" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.monthly}>
                <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={24} />
                <Tooltip
                  cursor={{ fill: "hsl(var(--muted) / 0.4)" }}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="count" fill="hsl(30 95% 55%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
        <div className="mb-3 flex items-center justify-between text-xs">
          <span className="font-bold">نشاط ٩٠ يوم</span>
          <span className="text-muted-foreground">
            {stats.calendar.reduce((s, c) => s + c.count, 0)} نشاط
          </span>
        </div>
        <div className="overflow-x-auto pb-1">
          <Calendar days={stats.calendar} />
        </div>
      </div>
    </section>
  );
}
