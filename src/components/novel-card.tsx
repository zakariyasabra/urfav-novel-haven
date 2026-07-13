import { Link } from "@tanstack/react-router";
import { Eye, Star } from "lucide-react";
import { coverUrl } from "@/lib/covers";
import { formatViews, useStatusLabel } from "@/lib/format";
import { useT } from "@/i18n/provider";

export interface NovelCardData {
  slug: string;
  title: string;
  author: string;
  cover_url: string | null;
  status: string;
  views_count: number;
  rating_avg: number;
}

export function NovelCard({ novel, priority }: { novel: NovelCardData; priority?: boolean }) {
  const statusLabel = useStatusLabel();
  return (
    <Link
      to="/novels/$slug"
      params={{ slug: novel.slug }}
      className="group block card-hover hover:card-hover-active"
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-surface shadow-card">
        <img
          src={coverUrl(novel.cover_url)}
          alt={novel.title}
          loading={priority ? "eager" : "lazy"}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-90" />
        <div className="absolute top-2 start-2 rounded-md bg-primary/95 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
          {statusLabel(novel.status)}
        </div>
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="mb-1 line-clamp-2 text-sm font-bold text-white group-hover:text-primary-glow">
            {novel.title}
          </h3>
          <div className="flex items-center gap-3 text-[11px] text-white/70">
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{formatViews(novel.views_count)}</span>
            <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-gold text-gold" />{Number(novel.rating_avg).toFixed(1)}</span>
          </div>
        </div>
      </div>
      <div className="mt-2 truncate px-1 text-xs text-muted-foreground">{novel.author}</div>
    </Link>
  );
}

export function NovelGrid({ novels }: { novels: NovelCardData[] }) {
  const t = useT();
  if (novels.length === 0) {
    return <div className="rounded-xl border border-dashed border-border/60 p-12 text-center text-muted-foreground">{t("common.noResults")}</div>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {novels.map((n) => <NovelCard key={n.slug} novel={n} />)}
    </div>
  );
}
