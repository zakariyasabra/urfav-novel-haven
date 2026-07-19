import { showError } from "@/lib/errors";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  Users,
  BookOpen,
  Heart,
  ShieldCheck,
  Globe,
  Twitter,
  Instagram,
  Facebook,
  ExternalLink,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NovelCard, type NovelCardData } from "@/components/novel-card";
import {
  fetchAuthorByUsername,
  fetchAuthorNovels,
  fetchAuthorFollowerCount,
  isFollowingAuthor,
  toggleFollowAuthor,
} from "@/lib/reader-api";
import { useAuth } from "@/hooks/use-auth";
import { coverUrl } from "@/lib/covers";
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
          avatar: a.avatar_url ?? null,
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

function AuthorProfile() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [following, setFollowing] = useState(false);

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
  const followersQ = useQuery({
    queryKey: ["author-followers", author?.id],
    queryFn: () => fetchAuthorFollowerCount(author!.id),
    enabled: !!author,
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
      qc.invalidateQueries({ queryKey: ["author-followers", author.id] });
    } catch (e: unknown) {
      showError(e);
    }
  }

  if (authorQ.isLoading)
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted-foreground">
        جاري التحميل…
      </div>
    );
  if (!author)
    return <div className="mx-auto max-w-4xl px-4 py-16 text-center">لم يتم العثور على الكاتب</div>;

  const novels = (novelsQ.data ?? []) as unknown as (NovelCardData & {
    id: string;
    is_published: boolean;
    is_upcoming?: boolean;
  })[];
  const published = novels.filter((n) => n.is_published && !n.is_upcoming);
  const upcoming = novels.filter((n) => n.is_upcoming);
  const drafts = novels.filter((n) => !n.is_published && !n.is_upcoming);

  const socials = author.social_links ?? {};
  const totalViews = published.reduce((s, n) => s + (n.views_count ?? 0), 0);

  return (
    <div className="pb-16">
      {/* Cover */}
      <div className="relative h-56 md:h-72 bg-gradient-to-br from-primary/20 via-surface to-background overflow-hidden">
        {author.cover_url && (
          <img src={author.cover_url} alt="" className="h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="mx-auto -mt-16 max-w-5xl px-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-end gap-4">
          <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border-4 border-background bg-gradient-to-br from-primary to-primary-glow text-2xl font-black text-primary-foreground shadow-elevated md:h-32 md:w-32 md:text-4xl">
            {author.avatar_url ? (
              <img src={author.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              (author.display_name || author.username).slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0 pb-2">
            <h1 className="flex items-center gap-2 truncate text-xl font-black md:text-3xl">
              {author.display_name || author.username}
              {author.is_verified && <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />}
            </h1>
            <div className="mt-0.5 truncate text-sm text-muted-foreground">@{author.username}</div>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
            {user && user.id !== author.id && (
              <GiftCoinsButton
                authorId={author.id}
                authorName={author.display_name || author.username}
              />
            )}
            <Button size="sm" onClick={onFollow} variant={following ? "secondary" : "default"}>
              <Heart className={`me-1 h-4 w-4 ${following ? "fill-current" : ""}`} />
              {following ? "متابَع" : "متابعة"}
            </Button>
          </div>
        </div>

        {author.bio && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-foreground/85">{author.bio}</p>
        )}

        {/* Stats */}
        <div className="mt-5 grid grid-cols-3 gap-3 md:max-w-md">
          <Stat icon={Users} value={(followersQ.data ?? 0).toLocaleString("ar")} label="متابع" />
          <Stat icon={BookOpen} value={published.length.toLocaleString("ar")} label="رواية" />
          <Stat icon={Heart} value={formatN(totalViews)} label="قراءة" />
        </div>

        {/* Socials */}
        {Object.keys(socials).length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {socials.website && <SocialChip href={socials.website} icon={Globe} label="الموقع" />}
            {socials.twitter && <SocialChip href={socials.twitter} icon={Twitter} label="تويتر" />}
            {socials.instagram && (
              <SocialChip href={socials.instagram} icon={Instagram} label="إنستغرام" />
            )}
            {socials.facebook && (
              <SocialChip href={socials.facebook} icon={Facebook} label="فيسبوك" />
            )}
          </div>
        )}

        {/* Novels */}
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-black">الروايات المنشورة ({published.length})</h2>
          {published.length === 0 ? (
            <Empty text="لا روايات منشورة بعد" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {published.map((n) => (
                <NovelCard key={n.slug} novel={n} />
              ))}
            </div>
          )}
        </section>

        {upcoming.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-black">قادم قريباً ({upcoming.length})</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {upcoming.map((n) => (
                <div key={n.slug} className="relative">
                  <NovelCard novel={n} />
                  <span className="absolute end-2 top-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                    قريباً
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {drafts.length > 0 && user?.id === author.id && (
          <section className="mt-10">
            <h2 className="mb-4 text-xl font-black">مسودات ({drafts.length})</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {drafts.map((n) => (
                <Link
                  key={n.slug}
                  to="/author/novels/$id"
                  params={{ id: n.id }}
                  className="grid grid-cols-[52px_minmax(0,1fr)] items-center gap-3 rounded-xl border border-dashed border-border/60 bg-surface/40 p-3"
                >
                  <img
                    src={coverUrl(n.cover_url)}
                    alt=""
                    className="h-16 w-13 rounded object-cover"
                  />
                  <div className="min-w-0">
                    <div className="truncate font-bold">{n.title}</div>
                    <div className="text-xs text-amber-500">مسودة</div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-xl border border-border/40 bg-surface/40 p-3 text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-primary" />
      <div className="text-lg font-black">{value}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
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
      className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-surface/40 px-3 py-1.5 text-xs font-semibold transition-colors hover:border-primary hover:text-primary"
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
      <ExternalLink className="h-3 w-3 opacity-60" />
    </a>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function formatN(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "م";
  if (n >= 1000) return (n / 1000).toFixed(1) + "ك";
  return n.toLocaleString("ar");
}
