import { useEffect, useState } from "react";
import { BookOpen, Clock, Flame, BookMarked, Trophy, User as UserIcon, Tag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { gmReadingStats } from "@/lib/gamification-api";

/** Compact stat card. */
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

type FavNovel = { id?: string; slug?: string; title?: string; cover_url?: string | null };
type FavGenre = { id?: string; name?: string; slug?: string };

function normalizeFavNovel(v: unknown): FavNovel | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;
  const title = typeof o.title === "string" ? o.title : undefined;
  const slug = typeof o.slug === "string" ? o.slug : undefined;
  if (!title && !slug) return null;
  return {
    id: typeof o.id === "string" ? o.id : undefined,
    slug,
    title,
    cover_url: typeof o.cover_url === "string" ? o.cover_url : null,
  };
}

function normalizeFavAuthor(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const n = (o.name ?? o.display_name ?? o.username);
    return typeof n === "string" ? n : null;
  }
  return null;
}

function normalizeFavGenre(v: unknown): FavGenre | null {
  if (!v) return null;
  if (typeof v === "string") return { name: v };
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const name = typeof o.name === "string" ? o.name
      : typeof o.name_ar === "string" ? o.name_ar
      : typeof o.name_en === "string" ? o.name_en
      : typeof o.slug === "string" ? o.slug : undefined;
    if (!name) return null;
    return {
      id: typeof o.id === "string" ? o.id : undefined,
      slug: typeof o.slug === "string" ? o.slug : undefined,
      name,
    };
  }
  return null;
}

function toArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function toNumber(v: unknown, def = 0): number {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : def;
}

export function ReadingStatsPanel() {
  const [raw, setRaw] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    gmReadingStats()
      .then((s) => {
        if (cancelled) return;
        setRaw((s as unknown as Record<string, unknown>) ?? null);
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
  if (!raw) {
    return (
      <div className="rounded-2xl border border-border/40 bg-card/60 p-6 text-center text-sm text-muted-foreground">
        لا توجد إحصائيات قراءة بعد. ابدأ بقراءة فصل لتظهر بياناتك هنا.
      </div>
    );
  }

  const totalChapters = toNumber(raw.total_chapters_read);
  const totalMinutes = toNumber(raw.total_minutes ?? (raw as any).total_reading_time_minutes);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const completedNovels = toNumber(raw.completed_novels);
  const novelsRead = toNumber(raw.novels_read);
  const currentStreak = toNumber(raw.current_streak ?? (raw as any).current_streak_days);
  const longestStreak = toNumber(raw.longest_streak ?? (raw as any).longest_streak_days);

  const monthly = toArray<Record<string, unknown>>(raw.monthly).map((m) => ({
    month: String(m.month ?? ""),
    count: toNumber(m.count),
  }));
  const calendar = toArray<Record<string, unknown>>(raw.calendar).map((c) => ({
    day: String(c.day ?? c.date ?? ""),
    count: toNumber(c.count),
  }));

  const favoriteNovel = normalizeFavNovel(raw.favorite_novel);
  const favoriteAuthor = normalizeFavAuthor(raw.favorite_author);
  let favoriteGenre = normalizeFavGenre(raw.favorite_genre);
  if (!favoriteGenre) {
    const arr = toArray<unknown>((raw as any).favorite_genres);
    if (arr.length > 0) favoriteGenre = normalizeFavGenre(arr[0]);
  }

  return (
    <section className="space-y-4">
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <BookOpen className="h-4 w-4 text-primary" /> إحصائيات القراءة
      </h3>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        <Stat icon={<BookOpen className="h-3.5 w-3.5" />} label="فصول مقروءة" value={totalChapters} />
        <Stat
          icon={<BookMarked className="h-3.5 w-3.5" />}
          label="روايات مكتملة"
          value={completedNovels}
          sub={`من ${novelsRead} رواية`}
        />
        <Stat
          icon={<Clock className="h-3.5 w-3.5" />}
          label="وقت القراءة"
          value={hours > 0 ? `${hours}س ${minutes}د` : `${minutes}د`}
        />
        <Stat
          icon={<Flame className="h-3.5 w-3.5" />}
          label="التتابع"
          value={currentStreak}
          sub={`أطول: ${longestStreak}`}
        />
      </div>

      {(favoriteNovel || favoriteAuthor || favoriteGenre) ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {favoriteNovel ? (
            favoriteNovel.slug ? (
              <Link
                to="/novels/$slug"
                params={{ slug: favoriteNovel.slug }}
                className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3 transition hover:border-primary/40"
              >
                {favoriteNovel.cover_url ? (
                  <img src={favoriteNovel.cover_url} alt="" className="h-14 w-10 rounded object-cover" loading="lazy" />
                ) : (
                  <div className="h-14 w-10 rounded bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted-foreground">الرواية المفضلة</div>
                  <div className="truncate text-sm font-bold">{favoriteNovel.title ?? "—"}</div>
                </div>
              </Link>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3">
                {favoriteNovel.cover_url ? (
                  <img src={favoriteNovel.cover_url} alt="" className="h-14 w-10 rounded object-cover" loading="lazy" />
                ) : (
                  <div className="h-14 w-10 rounded bg-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] text-muted-foreground">الرواية المفضلة</div>
                  <div className="truncate text-sm font-bold">{favoriteNovel.title ?? "—"}</div>
                </div>
              </div>
            )
          ) : null}
          {favoriteAuthor ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <UserIcon className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground">الكاتب المفضل</div>
                <div className="truncate text-sm font-bold">{favoriteAuthor}</div>
              </div>
            </div>
          ) : null}
          {favoriteGenre ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 p-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10">
                <Tag className="h-5 w-5 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-muted-foreground">التصنيف المفضل</div>
                <div className="truncate text-sm font-bold">{favoriteGenre.name ?? "—"}</div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {monthly.length > 0 ? (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold">
            <Trophy className="h-3.5 w-3.5 text-primary" /> فصول لكل شهر (آخر ١٢ شهراً)
          </div>
          <div className="h-40" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly}>
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
            {calendar.reduce((s, c) => s + (Number(c?.count) || 0), 0)} نشاط
          </span>
        </div>
        <div className="overflow-x-auto pb-1">
          <Calendar days={calendar} />
        </div>
      </div>
    </section>
  );
}
