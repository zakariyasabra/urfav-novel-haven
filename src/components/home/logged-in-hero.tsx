import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ChevronLeft,
  Flame,
  Library,
  Sparkles,
  Clock,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";
import { useGamification } from "@/hooks/use-gamification";
import { fetchNovels } from "@/lib/api";
import { supabase } from "@/integrations/supabase/client";
import { NovelCard } from "@/components/novel-card";
import { Button } from "@/components/ui/button";
import { coverUrl } from "@/lib/covers";
import { levelProgress } from "@/lib/gamification-api";

type ContinueRow = {
  novel_id: string;
  chapter_id: string | null;
  last_read_at: string;
  novel: { slug: string; title: string; cover_url: string | null } | null;
  chapter: { chapter_number: number; title: string | null } | null;
};

export function LoggedInHero() {
  const t = useT();
  const { user } = useAuth();
  const { profile } = useGamification();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";

  const continueReading = useQuery({
    queryKey: ["home-continue-last", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reading_history")
        .select(
          "novel_id, chapter_id, last_read_at, novel:novels(slug,title,cover_url), chapter:chapters(chapter_number,title)",
        )
        .order("last_read_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return ((data ?? [])[0] as unknown as ContinueRow) ?? null;
    },
  });

  const latest = useQuery({
    queryKey: ["novels", "latest", 6],
    queryFn: () => fetchNovels({ sort: "latest", limit: 6 }),
    staleTime: 60_000,
  });

  const xp = profile ? levelProgress(profile.total_xp, profile.level) : null;

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Greeting + streak badge */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <BookOpen className="h-3.5 w-3.5" />
              <span>{t("home.welcomeBack")}</span>
            </div>
            <h1 className="text-2xl font-black sm:text-3xl md:text-4xl">
              {displayName ? (
                <>
                  {t("home.welcomeBackUser")}{" "}
                  <span className="text-gradient-primary">{displayName}</span>
                </>
              ) : (
                t("home.welcomeBack")
              )}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground sm:text-base">
              {t("home.loggedInSubtitle")}
            </p>
          </div>
          {profile && profile.streak_current > 0 && (
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2">
              <Flame className="h-5 w-5 text-orange-500" />
              <span className="text-sm font-bold text-orange-500">
                {t("home.streakDays", { n: profile.streak_current })}
              </span>
            </div>
          )}
        </div>

        {/* Quick stats */}
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={<Sparkles className="h-4 w-4 text-primary" />}
            label={t("home.level")}
            value={profile ? t("home.levelValue", { n: profile.level }) : "—"}
            sub={xp ? `${xp.pct}%` : undefined}
            progress={xp?.pct}
          />
          <StatCard
            icon={<Flame className="h-4 w-4 text-orange-500" />}
            label={t("home.streak")}
            value={profile ? t("home.streakDays", { n: profile.streak_current }) : "—"}
            sub={
              profile && profile.streak_longest > profile.streak_current
                ? t("home.bestStreak", { n: profile.streak_longest })
                : undefined
            }
          />
          <StatCard
            icon={<Library className="h-4 w-4 text-emerald-500" />}
            label={t("home.library")}
            value={t("home.myLibrary")}
          />
        </div>

        {/* Continue reading */}
        <div>
          {continueReading.data?.novel && continueReading.data?.chapter ? (
            <Link
              to="/novels/$slug/$chapter"
              params={{
                slug: continueReading.data.novel.slug,
                chapter: String(continueReading.data.chapter.chapter_number),
              }}
              className="group flex items-center gap-4 rounded-2xl border border-border/40 bg-surface p-4 transition-all hover:border-primary/50 hover:bg-surface/80"
            >
              <img
                src={coverUrl(continueReading.data.novel.cover_url)}
                alt={continueReading.data.novel.title}
                className="h-28 w-20 shrink-0 rounded-lg object-cover shadow-lg"
              />
              <div className="min-w-0 flex-1">
                <div className="mb-1 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("home.continueReading")}</span>
                </div>
                <div className="truncate text-lg font-bold group-hover:text-primary">
                  {continueReading.data.novel.title}
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {t("novel.chapter", { n: continueReading.data.chapter.chapter_number })}
                  {continueReading.data.chapter.title
                    ? ` — ${continueReading.data.chapter.title}`
                    : ""}
                </div>
              </div>
              <div className="hidden shrink-0 sm:block">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <ChevronLeft className="h-5 w-5" />
                </div>
              </div>
            </Link>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-2xl border border-border/40 bg-surface p-5">
              <div className="text-lg font-bold">{t("home.startJourney")}</div>
              <p className="text-sm text-muted-foreground">{t("home.startJourneyDesc")}</p>
              <Button
                asChild
                className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90"
              >
                <Link to="/latest" className="inline-flex items-center gap-1">
                  {t("home.startReading")} <ChevronLeft className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </div>

        {/* Recommended row */}
        <div className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-muted-foreground">
              {t("home.recommendedForYou")}
            </h3>
            <Link
              to="/latest"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-glow"
            >
              {t("common.viewAll")} <ChevronLeft className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {(latest.data ?? []).slice(0, 6).map((n) => (
              <NovelCard key={n.slug} novel={n} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/60 p-3">
      <div className="mb-2 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10">{icon}</div>
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="text-lg font-black">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
      {progress !== undefined && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div className="h-full rounded-full bg-primary" style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
  );
}

