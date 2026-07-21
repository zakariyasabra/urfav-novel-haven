import { showError } from "@/lib/errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Users,
  BookOpen,
  Eye,
  Star,
  ShieldCheck,
  Globe,
  Twitter,
  Instagram,
  Facebook,
  ExternalLink,
  Share2,
  Flag,
  Calendar,
  MapPin,
  PenLine,
  Heart,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AuthorNovelCard } from "@/components/author/author-novel-card";
import {
  fetchAuthorByUsername,
  fetchAuthorNovels,
  isFollowingAuthor,
  toggleFollowAuthor,
  fetchAuthorStats,
  fetchNovelChapterCounts,
  formatCompact,
} from "@/lib/author/api";
import { useAuth } from "@/hooks/use-auth";
import { absoluteCoverUrl, coverUrl } from "@/lib/covers";
import { GiftCoinsButton } from "@/components/gift-coins-dialog";
import { SITE_URL, SITE_NAME } from "@/lib/site-config";

export const Route = createFileRoute("/authors/$username")({
  loader: async ({ params }) => {
    try {
      const a = await fetchAuthorByUsername(params.username);
      if (!a) return { seo: null };
      return {
        seo: {
          name: a.display_name || a.username,
          username: a.username,
          bio: (a.bio ?? "").slice(0, 300),
          avatar: a.avatar_url ? absoluteCoverUrl(a.avatar_url, SITE_URL) : null,
        },
      };
    } catch {
      return { seo: null };
    }
  },
  head: ({ params, loaderData }) => {
    const seo = loaderData?.seo;
    const url = `${SITE_URL}/authors/${params.username}`;
    const title = seo
      ? `${seo.name} — كاتب | ${SITE_NAME}`
      : `${params.username} — كاتب | ${SITE_NAME}`;
    const desc =
      seo?.bio || `صفحة الكاتب ${params.username} على ${SITE_NAME}. تصفح رواياته وتابعه.`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:type", content: "profile" },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (seo?.avatar) {
      meta.push({ property: "og:image", content: seo.avatar });
      meta.push({ name: "twitter:image", content: seo.avatar });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (seo) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Person",
          name: seo.name,
          alternateName: seo.username,
          description: seo.bio || undefined,
          image: seo.avatar || undefined,
          url,
        }),
      });
    }
    return { meta, links: [{ rel: "canonical", href: url }], scripts };
  },
  component: AuthorProfile,
});

/* ─────────────────────────  Utilities  ───────────────────────── */

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  const cp = code
    .toUpperCase()
    .split("")
    .map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...cp);
}

function formatJoinDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-EG", { year: "numeric", month: "long" }).format(
      new Date(iso),
    );
  } catch {
    return "";
  }
}

/** Smooth count-up animation for numeric stats. */
function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    fromRef.current = value;
    startRef.current = null;
    let raf = 0;
    const step = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const p = Math.min(1, (t - startRef.current) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

/* ────────────────────────────  Page  ──────────────────────────── */

function AuthorProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [following, setFollowing] = useState(false);
  const [bioExpanded, setBioExpanded] = useState(false);

  const authorQ = useQuery({
    queryKey: ["author", username],
    queryFn: () => fetchAuthorByUsername(username),
  });
  const author = authorQ.data;

  const novelsQ = useQuery({
    queryKey: ["author-novels", author?.id],
    queryFn: () => fetchAuthorNovels(author!.id),
    enabled: !!author,
  });
  const statsQ = useQuery({
    queryKey: ["author-stats", author?.id],
    queryFn: () => fetchAuthorStats(author!.id),
    enabled: !!author,
  });

  const novelIds = (novelsQ.data ?? []).map((n) => n.id);
  const chapterCountsQ = useQuery({
    queryKey: ["author-novels-chapter-counts", author?.id, novelIds.join(",")],
    queryFn: () => fetchNovelChapterCounts(novelIds),
    enabled: novelIds.length > 0,
  });

  useEffect(() => {
    if (author?.id && user) isFollowingAuthor(author.id).then(setFollowing);
  }, [author?.id, user?.id]);

  async function onFollow() {
    if (!user) return toast.error("سجل الدخول للمتابعة");
    if (!author) return;
    try {
      await toggleFollowAuthor(author.id, !following);
      setFollowing((v) => !v);
      qc.invalidateQueries({ queryKey: ["author-stats", author.id] });
    } catch (e: unknown) {
      showError(e);
    }
  }

  async function onShare() {
    if (!author) return;
    const url = `${SITE_URL}/authors/${author.username}`;
    const title = `${author.display_name || author.username} على ${SITE_NAME}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("تم نسخ الرابط");
      }
    } catch {
      /* user cancelled */
    }
  }

  function onReport() {
    if (!user) return toast.error("سجل الدخول للإبلاغ");
    toast.info("تم استلام البلاغ وسيراجعه فريق الإشراف.");
  }

  if (authorQ.isLoading) return <ProfileSkeleton />;
  if (!author) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-24 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-surface/60 text-muted-foreground">
          <BookOpen className="h-7 w-7" />
        </div>
        <h1 className="mb-2 text-xl font-black">لم يتم العثور على الكاتب</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          تأكد من اسم المستخدم أو عد إلى الصفحة الرئيسية.
        </p>
        <Button asChild size="sm">
          <Link to="/">العودة للرئيسية</Link>
        </Button>
      </div>
    );
  }

  const novels = (novelsQ.data ?? []) as Array<{
    id: string;
    slug: string;
    title: string;
    cover_url: string | null;
    status: string;
    views_count: number;
    rating_avg: number;
    rating_count?: number | null;
    description?: string | null;
    updated_at?: string | null;
    is_published: boolean;
    is_upcoming: boolean | null;
  }>;
  const chapterCounts = chapterCountsQ.data ?? {};
  const published = novels.filter((n) => n.is_published && !n.is_upcoming);
  const upcoming = novels.filter((n) => n.is_upcoming);
  const drafts = novels.filter((n) => !n.is_published && !n.is_upcoming);
  const libraryTotal = published.length + upcoming.length;

  const stats = statsQ.data;
  const socials = author.social_links ?? {};
  const isOwner = user?.id === author.id;
  const displayName = author.display_name || author.username;
  const initial = displayName.slice(0, 1).toUpperCase();
  const bio = (author.bio ?? "").trim();
  const bioIsLong = bio.length > 140;

  return (
    <div className="animate-fade-in pb-24">
      {/* ═══════════════════════════  HEADER  ═══════════════════════════ */}
      <header className="relative">
        {/* Cover */}
        <div className="relative h-[160px] w-full overflow-hidden bg-gradient-to-br from-primary/25 via-surface to-background sm:h-[210px] md:h-[260px]">
          {author.cover_url && (
            <img
              src={coverUrl(author.cover_url)}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
              className="h-full w-full object-cover"
              loading="eager"
            />
          )}
          {/* Multi-stop gradient for premium blend into content */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-background/10 to-background" />
          <div className="absolute inset-x-0 bottom-0 h-3/4 bg-gradient-to-t from-background via-background/90 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,138,42,0.12),transparent_55%)]" />
        </div>

        <div className="mx-auto max-w-5xl px-4">
          {/* Identity row */}
          <div className="relative -mt-10 flex items-start gap-3 sm:-mt-12 sm:gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="grid h-[84px] w-[84px] place-items-center overflow-hidden rounded-2xl border-[3px] border-background bg-gradient-to-br from-primary to-primary-glow text-3xl font-black text-primary-foreground shadow-elevated ring-1 ring-primary/30 sm:h-24 sm:w-24 sm:rounded-3xl sm:text-3xl md:h-28 md:w-28">
                {author.avatar_url ? (
                  <img
                    src={coverUrl(author.avatar_url)}
                    alt={`${displayName} — صورة الكاتب`}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = "none";
                    }}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span aria-hidden>{initial}</span>
                )}
              </div>
              {author.is_verified && (
                <span
                  title="كاتب موثّق"
                  className="absolute -end-1 -bottom-1 grid h-6 w-6 place-items-center rounded-full border-2 border-background bg-primary text-primary-foreground shadow-md sm:h-7 sm:w-7"
                >
                  <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </span>
              )}
            </div>

            {/* Name + username + inline verified pill (desktop) */}
            <div className="min-w-0 flex-1 pt-3 sm:pt-6">
              <h1 className="flex min-w-0 items-center gap-1.5 text-[19px] font-black leading-tight sm:text-2xl md:text-3xl">
                <span className="truncate">{displayName}</span>
                {author.is_verified && (
                  <span className="hidden shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-bold text-primary sm:inline-flex sm:items-center sm:gap-1">
                    كاتب موثّق
                  </span>
                )}
              </h1>
              <div className="mt-0.5 truncate text-[12.5px] text-muted-foreground sm:text-sm">
                @{author.username}
              </div>
            </div>
          </div>

          {/* Meta chips */}
          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-muted-foreground sm:mt-3 sm:text-xs">
            {author.country_code && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span aria-hidden>{countryFlag(author.country_code)}</span>
                <span>{author.country_code.toUpperCase()}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              انضم {formatJoinDate(author.created_at)}
            </span>
            {socials.website && (
              <a
                href={socials.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 transition-colors hover:text-primary"
              >
                <Globe className="h-3 w-3" />
                الموقع
                <ExternalLink className="h-2.5 w-2.5 opacity-60" />
              </a>
            )}
          </div>

          {/* Bio */}
          {bio && (
            <div className="mt-3">
              <p
                className={`text-[13.5px] leading-relaxed text-foreground/85 sm:text-sm ${
                  bioIsLong && !bioExpanded ? "line-clamp-2" : ""
                }`}
              >
                {bio}
              </p>
              {bioIsLong && (
                <button
                  type="button"
                  onClick={() => setBioExpanded((v) => !v)}
                  className="mt-1 text-[12px] font-bold text-primary hover:underline"
                >
                  {bioExpanded ? "عرض أقل" : "قراءة المزيد"}
                </button>
              )}
            </div>
          )}

          {/* Action buttons — full-width sticky feel on mobile */}
          <div className="mt-3.5 flex items-center gap-2 sm:mt-4">
            {isOwner ? (
              <>
                <Button asChild size="sm" className="h-10 flex-1 font-bold sm:flex-none sm:px-5">
                  <Link to="/author">
                    <PenLine className="me-1.5 h-4 w-4" />
                    استوديو الكاتب
                  </Link>
                </Button>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-10 flex-1 font-bold sm:flex-none sm:px-5"
                >
                  <Link to="/author/profile">
                    <Settings className="me-1.5 h-4 w-4" />
                    تعديل الملف
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button
                  size="sm"
                  onClick={onFollow}
                  variant={following ? "secondary" : "default"}
                  className="h-10 flex-1 font-bold sm:flex-none sm:min-w-[130px]"
                >
                  <Heart
                    className={`me-1.5 h-4 w-4 ${following ? "fill-current" : ""}`}
                  />
                  {following ? "متابَع" : "متابعة"}
                </Button>
                {user && <GiftCoinsButton authorId={author.id} authorName={displayName} />}
              </>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={onShare}
              aria-label="مشاركة"
              className="h-10 w-10 shrink-0 p-0 sm:w-auto sm:px-3"
            >
              <Share2 className="h-4 w-4" />
              <span className="ms-1.5 hidden sm:inline">مشاركة</span>
            </Button>
            {!isOwner && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onReport}
                aria-label="إبلاغ"
                className="h-10 w-10 shrink-0 p-0 text-muted-foreground hover:text-destructive sm:hidden"
              >
                <Flag className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* ═══════════════════════════  STATS  ═══════════════════════════ */}
      <div className="mx-auto max-w-5xl px-4">
        <div className="mt-5 grid grid-cols-4 gap-2 sm:mt-6 sm:gap-3" role="list" aria-label="إحصائيات الكاتب">
          {statsQ.isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[74px] animate-pulse rounded-xl bg-surface/60 sm:h-[92px] sm:rounded-2xl"
              />
            ))
          ) : (
            <>
              <StatCompact
                icon={BookOpen}
                value={stats?.novelsPublished ?? published.length}
                label="روايات"
              />
              <StatCompact icon={Eye} value={stats?.totalViews ?? 0} label="قراءات" />
              <StatCompact icon={Users} value={stats?.followers ?? 0} label="متابع" />
              <StatCompact
                icon={Star}
                value={stats && stats.totalRatings > 0 ? stats.avgRating : 0}
                display={
                  stats && stats.totalRatings > 0 ? stats.avgRating.toFixed(1) : "—"
                }
                label="تقييم"
              />
            </>
          )}
        </div>

        {/* ═══════════════════════  NOVELS LIBRARY  ═══════════════════════ */}
        <section className="mt-6 sm:mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-[17px] font-black leading-tight sm:text-xl">
                مكتبة الكاتب
              </h2>
              <p className="mt-0.5 text-[11.5px] text-muted-foreground sm:text-xs">
                {libraryTotal > 0
                  ? `${libraryTotal} عمل${libraryTotal === 1 ? "" : ""} — الأحدث أولاً`
                  : "لا أعمال بعد"}
              </p>
            </div>
            {libraryTotal > 0 && (
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border/50 bg-surface/60 px-2.5 py-1 text-[11px] font-bold">
                <BookOpen className="h-3.5 w-3.5 text-primary" />
                {libraryTotal}
              </span>
            )}
          </div>

          {libraryTotal === 0 ? (
            <EmptyLibrary isOwner={isOwner} name={displayName} />
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
              {[...published, ...upcoming].map((n) => (
                <AuthorNovelCard
                  key={n.slug}
                  novel={{
                    ...n,
                    chapters_count: chapterCounts[n.id] ?? 0,
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* Drafts — owner only */}
        {drafts.length > 0 && isOwner && (
          <section className="mt-8">
            <h2 className="mb-3 text-base font-black sm:text-lg">
              مسودات{" "}
              <span className="text-muted-foreground">({drafts.length})</span>
            </h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((n) => (
                <Link
                  key={n.slug}
                  to="/author/novels/$id"
                  params={{ id: n.id }}
                  className="grid grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-dashed border-border/50 bg-surface/40 p-2.5 transition-colors hover:border-primary/50 hover:bg-surface/70"
                >
                  <img
                    src={coverUrl(n.cover_url)}
                    alt=""
                    className="h-16 w-12 rounded-md object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold">{n.title}</div>
                    <div className="text-[11px] text-amber-500">مسودة</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Social links */}
        {(socials.twitter || socials.instagram || socials.facebook) && (
          <div className="mt-8 flex flex-wrap items-center gap-2">
            {socials.twitter && (
              <SocialChip href={socials.twitter} icon={Twitter} label="تويتر" />
            )}
            {socials.instagram && (
              <SocialChip
                href={socials.instagram}
                icon={Instagram}
                label="إنستغرام"
              />
            )}
            {socials.facebook && (
              <SocialChip href={socials.facebook} icon={Facebook} label="فيسبوك" />
            )}
            {!isOwner && (
              <button
                type="button"
                onClick={onReport}
                className="ms-auto hidden items-center gap-1.5 rounded-full border border-border/50 bg-surface/40 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive sm:inline-flex"
              >
                <Flag className="h-3.5 w-3.5" />
                إبلاغ
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────  Sub-components  ──────────────────────── */

function StatCompact({
  icon: Icon,
  value,
  display,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  display?: string;
  label: string;
}) {
  const animated = useCountUp(Number.isFinite(value) ? value : 0);
  const rendered =
    display ??
    (Number.isInteger(value)
      ? formatCompact(Math.round(animated))
      : animated.toFixed(1));
  return (
    <div
      role="listitem"
      className="group/stat flex h-full flex-col items-center justify-center gap-1 rounded-xl border border-border/50 bg-gradient-to-br from-surface/70 via-surface/50 to-surface/30 px-2 py-2.5 text-center transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card sm:rounded-2xl sm:py-3"
    >
      <div className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10 text-primary transition-colors group-hover/stat:bg-primary/20 sm:h-8 sm:w-8">
        <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      </div>
      <div className="text-[15px] font-black tabular-nums leading-none sm:text-lg">
        {rendered}
      </div>
      <div className="text-[10.5px] font-medium text-muted-foreground sm:text-[11.5px]">
        {label}
      </div>
    </div>
  );
}

function SocialChip({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-surface/50 px-3 py-1.5 text-xs font-semibold transition-all hover:border-primary hover:bg-primary/10 hover:text-primary"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ExternalLink className="h-3 w-3 opacity-60" />
    </a>
  );
}

function EmptyLibrary({ isOwner, name }: { isOwner: boolean; name: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-border/60 bg-gradient-to-br from-surface/60 via-surface/30 to-transparent p-6 text-center sm:p-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,138,42,0.08),transparent_60%)]" />
      <div className="relative mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary shadow-inner">
        <BookOpen className="h-7 w-7" />
      </div>
      <h3 className="relative mb-1 text-[15px] font-black sm:text-lg">
        {isOwner ? "لم تنشر أي رواية بعد" : "لا روايات منشورة بعد"}
      </h3>
      <p className="relative mx-auto mb-4 max-w-md text-[13px] text-muted-foreground">
        {isOwner
          ? "ابدأ رحلتك ككاتب اليوم — أنشئ روايتك الأولى وشاركها مع القراء."
          : `سيظهر هنا كل عمل جديد من ${name} فور نشره.`}
      </p>
      {isOwner && (
        <Button asChild size="sm" className="relative">
          <Link to="/author/novels/new">
            <PenLine className="me-1.5 h-4 w-4" />
            أنشئ روايتك الأولى
          </Link>
        </Button>
      )}
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="pb-16">
      <div className="h-[150px] w-full animate-pulse bg-surface/60 sm:h-[190px] md:h-[240px]" />
      <div className="mx-auto max-w-5xl px-4">
        <div className="relative -mt-10 flex items-start gap-3 sm:-mt-12 sm:gap-4">
          <div className="h-[76px] w-[76px] shrink-0 animate-pulse rounded-2xl border-[3px] border-background bg-surface sm:h-24 sm:w-24 sm:rounded-3xl md:h-28 md:w-28" />
          <div className="min-w-0 flex-1 space-y-2 pt-3 sm:pt-6">
            <div className="h-6 w-40 animate-pulse rounded bg-surface" />
            <div className="h-3 w-24 animate-pulse rounded bg-surface/70" />
          </div>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[74px] animate-pulse rounded-xl bg-surface/60 sm:h-[88px] sm:rounded-2xl"
            />
          ))}
        </div>
        <div className="mt-6 space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[132px] animate-pulse rounded-2xl bg-surface/60"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
