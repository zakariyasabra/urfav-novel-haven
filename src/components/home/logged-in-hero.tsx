import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, BookOpen } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";
import { fetchNovels } from "@/lib/api";
import { NovelCard } from "@/components/novel-card";
import { Button } from "@/components/ui/button";

export function LoggedInHero() {
  const t = useT();
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "";

  const latest = useQuery({
    queryKey: ["novels", "latest", 6],
    queryFn: () => fetchNovels({ sort: "latest", limit: 6 }),
    staleTime: 60_000,
  });

  return (
    <section className="relative overflow-hidden border-b border-border/40 bg-surface/40">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary-glow">
              <BookOpen className="h-3.5 w-3.5" /> {t("home.welcomeBack")}
            </div>
            <h1 className="text-2xl font-black sm:text-3xl md:text-4xl">
              {displayName ? (
                <>
                  {t("home.welcomeBackUser")} <span className="text-gradient-primary">{displayName}</span>
                </>
              ) : (
                t("home.welcomeBack")
              )}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {t("home.loggedInSubtitle")}
            </p>
          </div>
          <Button asChild className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground hover:opacity-90">
            <Link to="/latest" className="inline-flex items-center gap-1">
              {t("home.startReading")} <ChevronLeft className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {(latest.data ?? []).slice(0, 6).map((n) => (
            <NovelCard key={n.slug} novel={n} />
          ))}
        </div>
      </div>
    </section>
  );
}
