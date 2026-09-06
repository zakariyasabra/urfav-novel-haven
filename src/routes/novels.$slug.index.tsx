import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, Star, BookOpen, Heart, Languages, Layers, ArrowLeft, X } from "lucide-react";
import { toast } from "sonner";
import {
  fetchNovelBySlug,
  fetchChapters,
  fetchNovels,
  incrementNovelView,
} from "@/lib/api";
import { coverUrl } from "@/lib/covers";
import { formatViews, statusLabel, timeAgoAr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { NovelCard } from "@/components/novel-card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ReviewsSection } from "@/components/novel/reviews-section";
import { ShareNovel } from "@/components/novel/share-novel";
import { BuyNovelDialog } from "@/components/novel/buy-novel-dialog";
import { SimilarNovels } from "@/components/novel/similar-novels";
import { AdSlot } from "@/components/ad-slot";
//import { AiAssistantPanel } from "@/components/ai/ai-assistant-panel";
import { ThreadedComments } from "@/components/reader/threaded-comments";
import { SITE_URL, SITE_NAME, canonicalUrl } from "@/lib/site-config";
import { usePreferences } from "@/i18n/provider";
import { pickText } from "@/lib/i18n-content";
import { useAutoTranslate } from "@/hooks/use-auto-translate";

export const Route = createFileRoute("/novels/$slug/")({
  component: NovelPage,
  // SSR data: warm the novel, its chapter list and the "related" row into the
  // React Query cache on the server, so the HTML already carries the title,
  // description, author, categories, status and chapter links. The cache is
  // dehydrated to the client (src/router.tsx), so the component's useQuery
  // calls reuse it with no duplicate fetch.
  loader: async ({ params, context: { queryClient } }) => {
    try {
      const n = await queryClient.ensureQueryData({
        queryKey: ["novel", params.slug],
        queryFn: () => fetchNovelBySlug(params.slug),
        staleTime: 60_000,
      });
      if (!n) return { seo: null };
      await Promise.all([
        queryClient
          .ensureQueryData({
            queryKey: ["chapters", n.id],
            queryFn: () => fetchChapters(n.id),
            staleTime: 60_000,
          })
          .catch(() => undefined),
        queryClient
          .ensureQueryData({
            queryKey: ["related"],
            queryFn: () => fetchNovels({ sort: "popular", limit: 6 }),
            staleTime: 60_000,
          })
          .catch(() => undefined),
      ]);
      return {
        seo: {
          title: n.title,
          author: n.author_profile?.display_name || n.author,
          authorUsername: n.author_profile?.username ?? null,
          description: (n.description ?? "").slice(0, 300),
          cover: n.cover_url ? coverUrl(n.cover_url) : null,
          rating: Number(n.rating_avg) || 0,
          ratingCount: n.rating_count || 0,
          genres: (n.novel_genres ?? []).map((g) => g.genre.name_ar),
          slug: n.slug,
          updated_at: n.updated_at,
        },
      };
    } catch {
      return { seo: null };
    }
  },

  head: ({ params, loaderData }) => {
    const seo = loaderData?.seo;
    const url = canonicalUrl(`/novels/${params.slug}`);
    const title = seo
      ? `${seo.title} — ${seo.author} | ${SITE_NAME}`
      : `${params.slug} — ${SITE_NAME}`;
    const desc = seo?.description || `اقرأ رواية ${params.slug} على ${SITE_NAME}.`;
    const image = seo?.cover;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:type", content: "book" },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:url", content: url },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: desc },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    const scripts: Array<{ type: string; children: string }> = [];
    if (seo) {
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Book",
          name: seo.title,
          author: { "@type": "Person", name: seo.author },
          description: seo.description,
          image: image ?? undefined,
          url,
          inLanguage: "ar",
          genre: seo.genres,
          aggregateRating:
            seo.ratingCount > 0
              ? {
                  "@type": "AggregateRating",
                  ratingValue: seo.rating.toFixed(1),
                  ratingCount: seo.ratingCount,
                  bestRating: "5",
                  worstRating: "1",
                }
              : undefined,
        }),
      });
      scripts.push({
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "الرئيسية", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "الروايات", item: `${SITE_URL}/latest` },
            { "@type": "ListItem", position: 3, name: seo.title, item: url },
          ],
        }),
      });
    }
    return { meta, links: [{ rel: "canonical", href: url }], scripts };
  },
});

function NovelPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lang } = usePreferences();

  const novelQ = useQuery({ queryKey: ["novel", slug], queryFn: () => fetchNovelBySlug(slug) });
  const chaptersQ = useQuery({
    queryKey: ["chapters", novelQ.data?.id],
    queryFn: () => fetchChapters(novelQ.data!.id),
    enabled: !!novelQ.data?.id,
  });
  const relatedQ = useQuery({
    queryKey: ["related"],
    queryFn: () => fetchNovels({ sort: "popular", limit: 6 }),
  });

  const [isFav, setIsFav] = useState(false);
  const [showAllChapters, setShowAllChapters] = useState(false);

  const authorData = (novelQ.data as any)?.author_profile;
  const authorUsername = authorData?.username;

  useEffect(() => {
    if (!user || !novelQ.data?.id) return;
    supabase
      .from("favorites")
      .select("novel_id")
      .eq("user_id", user.id)
      .eq("novel_id", novelQ.data.id)
      .maybeSingle()
      .then(({ data }) => setIsFav(!!data));
  }, [user, novelQ.data?.id]);

  useEffect(() => {
    if (novelQ.data?.id) incrementNovelView(novelQ.data.id);
  }, [novelQ.data?.id]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nAny = (novelQ.data ?? {}) as any;
  useAutoTranslate({
    entityType: "novel",
    entityId: novelQ.data?.id ?? "",
    needsTranslation: !!novelQ.data && lang === "en" && (!nAny.title_en || !nAny.description_en),
    invalidateKeys: [["novel", slug]],
  });

  async function toggleFavorite() {
    if (!user) {
      toast.error("يجب تسجيل الدخول لإضافة إلى المفضلة");
      navigate({ to: "/auth" });
      return;
    }
    if (!novelQ.data) return;
    if (isFav) {
      await supabase
        .from("favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("novel_id", novelQ.data.id);
      setIsFav(false);
      toast.success("أُزيلت من المفضلة");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, novel_id: novelQ.data.id });
      setIsFav(true);
      toast.success("أُضيفت إلى المفضلة");
    }
  }

  if (novelQ.isLoading)
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">
        جاري التحميل…
      </div>
    );
  if (!novelQ.data)
    return <div className="mx-auto max-w-7xl px-4 py-16 text-center">الرواية غير موجودة</div>;

  const n = novelQ.data;
  const title = pickText(nAny.title_ar, nAny.title_en, lang) || n.title;
  const authorName = authorData?.display_name || authorData?.name || pickText(nAny.author_display_ar, nAny.author_display_en, lang) || n.author;
  const authorAvatar = authorData?.avatar_url || "";
  const translator = pickText(nAny.translator_ar, nAny.translator_en, lang) || (n.translator ?? "");
  const description = pickText(nAny.description_ar, nAny.description_en, lang) || n.description;

  const genres = (n.novel_genres ?? []).map((g) => g.genre);
  const chapters = chaptersQ.data ?? [];
  const firstCh = chapters[0];

  return (
    <div>
      {/* Hero banner with blurred cover */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src={coverUrl(n.cover_url)}
            alt=""
            className="h-full w-full scale-110 object-cover opacity-30 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
          <div className="grid gap-8 md:grid-cols-[240px_1fr]">
            {/* العمود الأول: الغلاف وتحته اسم المؤلف بشكل أنيق */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-full max-w-[240px] overflow-hidden rounded-2xl border border-border/60 shadow-elevated glow-primary">
                <img
                  src={coverUrl(n.cover_url)}
                  alt={title}
                  className="aspect-[3/4] w-full object-cover"
                  width={768}
                  height={1024}
                />
              </div>

              {authorUsername && (
                <Link
                  to="/authors/$username"
                  params={{ username: authorUsername }}
                  className="group flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  {authorAvatar ? (
                    <img
                      src={authorAvatar}
                      alt={authorName}
                      className="h-6 w-6 rounded-full object-cover border border-border"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                        const next = (e.currentTarget as HTMLImageElement)
                          .nextElementSibling as HTMLElement | null;
                        if (next) next.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <span
                    className="grid h-6 w-6 place-items-center rounded-full border border-border bg-primary/10 text-[10px] font-bold text-primary"
                    style={{ display: authorAvatar ? "none" : "flex" }}
                  >
                    {(authorName || "?").slice(0, 1).toUpperCase()}
                  </span>

                  <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {authorName}
                  </span>
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                </Link>
              )}
            </div>

            {/* العمود الثاني: تفاصيل الرواية وأزرار التفاعل */}
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {statusLabel(n.status)}
                </span>
                {genres.map((g) => (
                  <Link
                    key={g.slug}
                    to="/categories/$slug"
                    params={{ slug: g.slug }}
                    className="rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {lang === "en" && g.name_en ? g.name_en : g.name_ar}
                  </Link>
                ))}
              </div>
              <h1 className="text-3xl font-black md:text-5xl">{title}</h1>
              <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                {translator && (
                  <div className="flex items-center gap-1.5">
                    <Languages className="h-4 w-4 text-primary" />
                    <span className="font-medium text-foreground">الترجمة:</span> {translator}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">المشاهدات:</span>{" "}
                  {formatViews(n.views_count)}
                </div>
                <div className="flex items-center gap-1.5">
                  <Star className="h-4 w-4 fill-gold text-gold" />
                  <span className="font-medium text-foreground">التقييم:</span>{" "}
                  {Number(n.rating_avg).toFixed(1)} ({n.rating_count})
                </div>
                <div className="flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">الفصول:</span> {chapters.length}
                </div>
              </div>
              <p className="mt-6 max-w-3xl leading-relaxed text-foreground/80">{description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {firstCh && (
                  <Button
                    asChild
                    size="lg"
                    className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
                  >
                    <Link
                      to="/novels/$slug/$chapter"
                      params={{ slug: n.slug, chapter: String(firstCh.chapter_number) }}
                    >
                      <BookOpen className="me-2 h-4 w-4" />
                      ابدأ القراءة
                    </Link>
                  </Button>
                )}
                <Button
                  onClick={toggleFavorite}
                  size="lg"
                  variant={isFav ? "default" : "outline"}
                  className={isFav ? "bg-primary text-primary-foreground" : "border-primary/40"}
                >
                  <Heart className={`me-2 h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                  {isFav ? "في المفضلة" : "إضافة إلى المفضلة"}
                </Button>
                {(n.coin_price ?? 0) > 0 && (
                  <BuyNovelDialog
                    novelId={n.id}
                    novelTitle={title}
                    price={n.coin_price ?? 0}
                    isPremium={!!n.is_premium}
                  />
                )}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <ShareNovel slug={n.slug} title={title} novelId={n.id} />
                {/* <AiAssistantPanel novelId={n.id} novelTitle={title} /> */}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 lg:grid-cols-3">
        {/* Chapters */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-2xl font-black">قائمة الفصول</h2>
          <div className="max-h-[560px] overflow-y-auto divide-y divide-border/40 rounded-xl border border-border/40 bg-surface/40">
            {chapters.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">لا توجد فصول بعد</div>
            )}
            {chapters.slice(0, 10).map((c) => (
              <Link
                key={c.id}
                to="/novels/$slug/$chapter"
                params={{ slug: n.slug, chapter: String(c.chapter_number) }}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-primary/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">
                    الفصل {c.chapter_number} — {c.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {timeAgoAr(c.created_at)} · {formatViews(c.views_count)} مشاهدة
                  </div>
                </div>
                <BookOpen className="h-4 w-4 text-primary" />
              </Link>
            ))}
          </div>
          {chapters.length > 10 && (
            <button
              onClick={() => setShowAllChapters(true)}
              className="mt-3 w-full rounded-lg border border-border/60 bg-surface/40 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              عرض جميع الفصول ({chapters.length})
            </button>
          )}

          {/* All chapters modal */}
          {showAllChapters && (
            <div
              className="fixed inset-0 z-[70] grid place-items-center bg-black/60 p-4"
              onClick={() => setShowAllChapters(false)}
            >
              <div
                className="flex w-full max-w-2xl flex-col rounded-xl border border-border/60 bg-popover text-popover-foreground shadow-2xl max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                  <div className="text-lg font-bold">جميع فصول الرواية</div>
                  <button
                    onClick={() => setShowAllChapters(false)}
                    className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="divide-y divide-border/40 overflow-y-auto p-0">
                  {chapters.map((c) => (
                    <Link
                      key={c.id}
                      to="/novels/$slug/$chapter"
                      params={{ slug: n.slug, chapter: String(c.chapter_number) }}
                      onClick={() => setShowAllChapters(false)}
                      className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-primary/5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold">
                          الفصل {c.chapter_number} — {c.title}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {timeAgoAr(c.created_at)} · {formatViews(c.views_count)} مشاهدة
                        </div>
                      </div>
                      <BookOpen className="h-4 w-4 text-primary" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Reviews */}
          <ReviewsSection
            novelId={n.id}
            ratingAvg={Number(n.rating_avg)}
            ratingCount={n.rating_count}
          />

          {/* Comments */}
          <div className="mt-10">
            <h2 className="mb-4 text-2xl font-black">التعليقات</h2>
            <ThreadedComments novelId={n.id} />
          </div>
        </div>

        {/* Related */}
        <aside>
          <AdSlot slot="sidebar" />
          <h2 className="mb-4 text-2xl font-black">قد يعجبك أيضاً</h2>
          <div className="grid grid-cols-2 gap-3">
            {(relatedQ.data ?? [])
              .filter((r) => r.slug !== n.slug)
              .slice(0, 6)
              .map((r) => (
                <NovelCard key={r.slug} novel={r} />
              ))}
          </div>
        </aside>
      </div>
      <div className="mx-auto max-w-7xl px-4 pb-16">
        <AdSlot slot="banner" />
        <SimilarNovels novelId={n.id} currentSlug={n.slug} />
      </div>
    </div>
  );
}
