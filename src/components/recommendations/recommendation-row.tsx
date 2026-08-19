import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  MoreHorizontal,
  ThumbsUp,
  EyeOff,
  X,
  CheckCheck,
  Sparkles,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { NovelCard } from "@/components/novel-card";
import {
  fetchRecommendationSection,
  submitRecFeedback,
  type FeedbackType,
  type RecNovel,
  type RecSection,
} from "@/lib/recommendations-api";
import { useT } from "@/i18n/provider";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RecommendationRowProps {
  section: RecSection;
  titleKey: string;
  viewAll?: string;
  limit?: number;
  requiresAuth?: boolean;
  isAuthed?: boolean;
}

export function RecommendationRow({
  section,
  titleKey,
  viewAll,
  limit = 12,
  requiresAuth,
  isAuthed,
}: RecommendationRowProps) {
  const t = useT();

  const enabled = !requiresAuth || !!isAuthed;
  const q = useQuery({
    queryKey: ["rec", section, limit, isAuthed ? "auth" : "anon"],
    queryFn: () => fetchRecommendationSection(section, limit),
    staleTime: 60_000,
    enabled,
  });

  if (!enabled) return null;
  if (q.isLoading) {
    return (
      <section>
        <SectionHeader title={t(titleKey)} viewAll={viewAll} viewAllLabel={t("common.viewAll")} />
        <div className="flex gap-4 overflow-hidden pb-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="w-32 shrink-0 sm:w-40 md:w-44">
              <div className="aspect-[3/4] animate-pulse rounded-xl bg-surface/60" />
              <div className="mt-2 h-3 w-2/3 animate-pulse rounded bg-surface/50" />
              <div className="mt-2 h-3 w-5/6 animate-pulse rounded bg-surface/40" />
            </div>
          ))}
        </div>
      </section>
    );
  }
  const items = q.data ?? [];
  if (items.length === 0) return null;


  return (
    <section>
      <SectionHeader title={t(titleKey)} viewAll={viewAll} viewAllLabel={t("common.viewAll")} />
      <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {items.map((it) => (
          <RecCard key={it.novel.id} item={it} onFeedback={() => q.refetch()} />
        ))}
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  viewAll,
  viewAllLabel,
}: {
  title: string;
  viewAll?: string;
  viewAllLabel: string;
}) {
  return (
    <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:mb-5">
      <h2 className="flex min-w-0 items-center gap-2 text-xl font-black sm:text-2xl md:text-3xl">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </span>
        <span className="truncate">{title}</span>
      </h2>
      {viewAll && (
        <Link
          to={viewAll as "/"}
          className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:text-primary-glow sm:text-sm"
        >
          {viewAllLabel} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

function RecCard({ item, onFeedback }: { item: RecNovel; onFeedback: () => void }) {
  const t = useT();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);

  const reason = (() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return t(item.reason_key, (item.reason_params ?? {}) as any);
    } catch {
      return "";
    }
  })();

  async function handle(fb: FeedbackType) {
    if (busy) return;
    setBusy(true);
    const res = await submitRecFeedback(item.novel.id, fb);
    setBusy(false);
    if (res.ok) {
      toast.success(t("rec.feedback.saved"));
      qc.invalidateQueries({ queryKey: ["rec"] });
      onFeedback();
    }
  }

  return (
    <div className="w-32 shrink-0 snap-start sm:w-40 md:w-44">
      <div className="relative">
        <NovelCard novel={item.novel} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={t("rec.feedback.title")}
              className="absolute end-1.5 top-1.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-80 backdrop-blur transition hover:bg-black/80 hover:opacity-100"
              onClick={(e) => e.preventDefault()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel>{t("rec.feedback.title")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handle("like")} disabled={busy}>
              <ThumbsUp className="me-2 h-4 w-4 text-primary" /> {t("rec.feedback.like")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handle("already_read")} disabled={busy}>
              <CheckCheck className="me-2 h-4 w-4" /> {t("rec.feedback.alreadyRead")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handle("not_interested")} disabled={busy}>
              <X className="me-2 h-4 w-4" /> {t("rec.feedback.notInterested")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handle("hide")} disabled={busy}>
              <EyeOff className="me-2 h-4 w-4" /> {t("rec.feedback.hide")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {reason && (
        <p className="mt-2 line-clamp-2 px-1 text-[11px] leading-snug text-muted-foreground">
          {reason}
        </p>
      )}
    </div>
  );
}
