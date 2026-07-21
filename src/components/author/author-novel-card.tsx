import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, Star, BookOpen, Clock, PlayCircle } from "lucide-react";
import { coverUrl } from "@/lib/covers";
import { formatViews, useStatusLabel } from "@/lib/format";
import { formatCompact } from "@/lib/author/api";

export interface AuthorNovelCardData {
  slug: string;
  title: string;
  cover_url: string | null;
  status: string;
  views_count: number;
  rating_avg: number;
  rating_count?: number | null;
  description?: string | null;
  updated_at?: string | null;
  chapters_count?: number;
  is_upcoming?: boolean | null;
}

function timeAgoAr(iso: string | null | undefined): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diff = Math.max(0, Date.now() - then);
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  if (d < 7) return `منذ ${d} ي`;
  const w = Math.floor(d / 7);
  if (w < 5) return `منذ ${w} أ`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `منذ ${mo} شهر`;
  const y = Math.floor(d / 365);
  return `منذ ${y} س`;
}

/**
 * Premium horizontal novel card for the public author profile.
 * Larger cover, refined typography, animated hover/press states.
 */
export function AuthorNovelCard({ novel }: { novel: AuthorNovelCardData }) {
  const statusLabel = useStatusLabel();
  const rating = Number(novel.rating_avg ?? 0);
  const hasRating = (novel.rating_count ?? 0) > 0;
  const desc = (novel.description ?? "").trim();
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      to="/novels/$slug"
      params={{ slug: novel.slug }}
      aria-label={novel.title}
      className="group relative flex gap-3 overflow-hidden rounded-2xl border border-border/50 bg-surface/50 p-3 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-surface/80 hover:shadow-elevated active:scale-[0.99] active:duration-75 sm:gap-4 sm:p-3.5"
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-[104px] shrink-0 overflow-hidden rounded-xl bg-surface shadow-card sm:w-[124px] md:w-[132px]">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-surface via-surface/60 to-surface/40" />
        )}
        <img
          src={coverUrl(imgError ? null : novel.cover_url)}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgError(true);
            setImgLoaded(true);
          }}
          className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-[1.06] ${imgLoaded ? "opacity-100" : "opacity-0"}`}
        />
        {/* Subtle gradient overlay for premium feel */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        {novel.is_upcoming && (
          <span className="absolute inset-x-1.5 top-1.5 rounded-md bg-primary/95 px-1.5 py-0.5 text-center text-[10px] font-black tracking-wide text-primary-foreground shadow-md backdrop-blur">
            قريباً
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex min-w-0 flex-1 flex-col py-0.5">
        {/* Status + rating */}
        <div className="mb-1.5 flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10.5px] font-black text-primary">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_currentColor]" />
            {statusLabel(novel.status)}
          </span>
          {hasRating && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-gold/10 px-1.5 py-0.5 text-[11px] font-black text-gold">
              <Star className="h-3 w-3 fill-current" />
              <span className="tabular-nums">{rating.toFixed(1)}</span>
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="line-clamp-2 text-[16px] font-black leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-[17px]">
          {novel.title}
        </h3>

        {/* Description */}
        {desc && (
          <p className="mt-1 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
            {desc}
          </p>
        )}

        {/* Meta row */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-2 text-[11.5px] font-medium text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Eye className="h-3.5 w-3.5 opacity-80" />
            <span className="tabular-nums">{formatViews(novel.views_count ?? 0)}</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <BookOpen className="h-3.5 w-3.5 opacity-80" />
            <span className="tabular-nums">{formatCompact(novel.chapters_count ?? 0)}</span>
            <span>فصل</span>
          </span>
          {novel.updated_at && (
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 opacity-80" />
              {timeAgoAr(novel.updated_at)}
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="mt-2.5 hidden xs:flex">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-primary/15 to-primary/5 px-3 py-1.5 text-[11.5px] font-black text-primary shadow-sm transition-all duration-300 group-hover:from-primary group-hover:to-primary-glow group-hover:text-primary-foreground group-hover:shadow-md">
            <PlayCircle className="h-3.5 w-3.5" />
            متابعة القراءة
          </span>
        </div>
      </div>
    </Link>
  );
}
