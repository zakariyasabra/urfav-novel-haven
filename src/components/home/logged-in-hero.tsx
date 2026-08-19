import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ChevronLeft, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { coverUrl } from "@/lib/covers";
import { DailyMissionsWidget } from "@/components/gamification/daily-missions-widget";

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

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8">
        {/* Greeting */}
        <div className="mb-5">
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

        {/* Continue reading */}
        <div className="mb-5">
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

        {/* Daily missions */}
        <DailyMissionsWidget />
      </div>
    </section>
  );
}
