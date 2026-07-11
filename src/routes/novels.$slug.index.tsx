import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, Star, BookOpen, Heart, User, Languages, Layers } from "lucide-react";
import { toast } from "sonner";
import {
  fetchNovelBySlug, fetchChapters, fetchNovels, incrementNovelView,
  fetchComments,
} from "@/lib/api";
import { coverUrl } from "@/lib/covers";
import { formatViews, statusLabel, timeAgoAr } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { NovelCard } from "@/components/novel-card";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ReviewsSection } from "@/components/novel/reviews-section";
import { ShareNovel } from "@/components/novel/share-novel";
import { SimilarNovels } from "@/components/novel/similar-novels";
import { ThreadedComments } from "@/components/reader/threaded-comments";

export const Route = createFileRoute("/novels/$slug/")({
  component: NovelPage,
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} — UR Fav Novel` },
      { property: "og:type", content: "book" },
    ],
    links: [{ rel: "canonical", href: `/novels/${params.slug}` }],
  }),
});

function NovelPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();

  const novelQ = useQuery({ queryKey: ["novel", slug], queryFn: () => fetchNovelBySlug(slug) });
  const chaptersQ = useQuery({
    queryKey: ["chapters", novelQ.data?.id],
    queryFn: () => fetchChapters(novelQ.data!.id),
    enabled: !!novelQ.data?.id,
  });
  const relatedQ = useQuery({ queryKey: ["related"], queryFn: () => fetchNovels({ sort: "popular", limit: 6 }) });
  const commentsQ = useQuery({
    queryKey: ["comments", "novel", novelQ.data?.id],
    queryFn: () => fetchComments({ novelId: novelQ.data!.id }),
    enabled: !!novelQ.data?.id,
  });

  const [isFav, setIsFav] = useState(false);
  useEffect(() => {
    if (!user || !novelQ.data?.id) return;
    supabase.from("favorites").select("novel_id").eq("user_id", user.id).eq("novel_id", novelQ.data.id).maybeSingle().then(({ data }) => setIsFav(!!data));
  }, [user, novelQ.data?.id]);

  useEffect(() => {
    if (novelQ.data?.id) incrementNovelView(novelQ.data.id);
  }, [novelQ.data?.id]);

  async function toggleFavorite() {
    if (!user) { toast.error("يجب تسجيل الدخول لإضافة إلى المفضلة"); navigate({ to: "/auth" }); return; }
    if (!novelQ.data) return;
    if (isFav) {
      await supabase.from("favorites").delete().eq("user_id", user.id).eq("novel_id", novelQ.data.id);
      setIsFav(false); toast.success("أُزيلت من المفضلة");
    } else {
      await supabase.from("favorites").insert({ user_id: user.id, novel_id: novelQ.data.id });
      setIsFav(true); toast.success("أُضيفت إلى المفضلة");
    }
  }

  if (novelQ.isLoading) return <div className="mx-auto max-w-7xl px-4 py-16 text-center text-muted-foreground">جاري التحميل…</div>;
  if (!novelQ.data) return <div className="mx-auto max-w-7xl px-4 py-16 text-center">الرواية غير موجودة</div>;

  const n = novelQ.data;
  const genres = (n.novel_genres ?? []).map((g) => g.genre);
  const chapters = chaptersQ.data ?? [];
  const firstCh = chapters[0];

  return (
    <div>
      {/* Hero banner with blurred cover */}
      <div className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img src={coverUrl(n.cover_url)} alt="" className="h-full w-full scale-110 object-cover opacity-30 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
        </div>
        <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
          <div className="grid gap-8 md:grid-cols-[260px_1fr]">
            <div className="mx-auto w-48 md:w-full">
              <div className="overflow-hidden rounded-2xl border border-border/60 shadow-elevated glow-primary">
                <img src={coverUrl(n.cover_url)} alt={n.title} className="aspect-[3/4] w-full object-cover" width={768} height={1024} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">{statusLabel(n.status)}</span>
                {genres.map((g) => (
                  <Link key={g.slug} to="/categories/$slug" params={{ slug: g.slug }} className="rounded-md border border-border/60 px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-primary">
                    {g.name_ar}
                  </Link>
                ))}
              </div>
              <h1 className="text-3xl font-black md:text-5xl">{n.title}</h1>
              <div className="mt-3 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
                <div className="flex items-center gap-1.5"><User className="h-4 w-4 text-primary" /><span className="font-medium text-foreground">المؤلف:</span> {n.author}</div>
                {n.translator && <div className="flex items-center gap-1.5"><Languages className="h-4 w-4 text-primary" /><span className="font-medium text-foreground">الترجمة:</span> {n.translator}</div>}
                <div className="flex items-center gap-1.5"><Eye className="h-4 w-4 text-primary" /><span className="font-medium text-foreground">المشاهدات:</span> {formatViews(n.views_count)}</div>
                <div className="flex items-center gap-1.5"><Star className="h-4 w-4 fill-gold text-gold" /><span className="font-medium text-foreground">التقييم:</span> {Number(n.rating_avg).toFixed(1)} ({n.rating_count})</div>
                <div className="flex items-center gap-1.5"><Layers className="h-4 w-4 text-primary" /><span className="font-medium text-foreground">الفصول:</span> {chapters.length}</div>
              </div>
              <p className="mt-6 max-w-3xl leading-relaxed text-foreground/80">{n.description}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {firstCh && (
                  <Button asChild size="lg" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
                    <Link to="/novels/$slug/$chapter" params={{ slug: n.slug, chapter: String(firstCh.chapter_number) }}>
                      <BookOpen className="me-2 h-4 w-4" />ابدأ القراءة
                    </Link>
                  </Button>
                )}
                <Button onClick={toggleFavorite} size="lg" variant={isFav ? "default" : "outline"} className={isFav ? "bg-primary text-primary-foreground" : "border-primary/40"}>
                  <Heart className={`me-2 h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                  {isFav ? "في المفضلة" : "إضافة إلى المفضلة"}
                </Button>
              </div>
              <div className="mt-4"><ShareNovel slug={n.slug} title={n.title} novelId={n.id} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-16 lg:grid-cols-3">
        {/* Chapters */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-2xl font-black">قائمة الفصول</h2>
          <div className="divide-y divide-border/40 rounded-xl border border-border/40 bg-surface/40">
            {chapters.length === 0 && <div className="p-8 text-center text-muted-foreground">لا توجد فصول بعد</div>}
            {chapters.map((c) => (
              <Link
                key={c.id}
                to="/novels/$slug/$chapter"
                params={{ slug: n.slug, chapter: String(c.chapter_number) }}
                className="flex items-center justify-between gap-3 p-4 transition-colors hover:bg-primary/5"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold">الفصل {c.chapter_number} — {c.title}</div>
                  <div className="text-xs text-muted-foreground">{timeAgoAr(c.created_at)} · {formatViews(c.views_count)} مشاهدة</div>
                </div>
                <BookOpen className="h-4 w-4 text-primary" />
              </Link>
            ))}
          </div>

          {/* Comments */}
          <div className="mt-10">
            <h2 className="mb-4 text-2xl font-black">التعليقات</h2>
            <CommentBox novelId={n.id} onPosted={() => qc.invalidateQueries({ queryKey: ["comments", "novel", n.id] })} />
            <div className="mt-4 space-y-3">
              {(commentsQ.data ?? []).map((c) => (
                <div key={c.id} className="rounded-lg border border-border/40 bg-surface/50 p-3">
                  <div className="mb-1 flex items-center justify-between">
                    <div className="text-sm font-bold text-primary">{c.profile?.username ?? "مستخدم"}</div>
                    <div className="text-xs text-muted-foreground">{timeAgoAr(c.created_at)}</div>
                  </div>
                  <div className="text-sm text-foreground/90">{c.content}</div>
                </div>
              ))}
              {commentsQ.data && commentsQ.data.length === 0 && <div className="text-center text-sm text-muted-foreground">كن أول من يعلق</div>}
            </div>
          </div>
        </div>

        {/* Related */}
        <aside>
          <h2 className="mb-4 text-2xl font-black">قد يعجبك أيضاً</h2>
          <div className="grid grid-cols-2 gap-3">
            {(relatedQ.data ?? []).filter((r) => r.slug !== n.slug).slice(0, 6).map((r) => <NovelCard key={r.slug} novel={r} />)}
          </div>
        </aside>
      </div>
    </div>
  );
}

function CommentBox({ novelId, chapterId, onPosted }: { novelId?: string; chapterId?: string; onPosted: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) {
    return <div className="rounded-lg border border-border/40 bg-surface/40 p-4 text-center text-sm text-muted-foreground">
      <Link to="/auth" className="font-bold text-primary">سجل دخول</Link> لإضافة تعليق
    </div>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || !user) return;
    setBusy(true);
    const { error } = await supabase.from("comments").insert({
      user_id: user.id,
      content: text.trim(),
      novel_id: novelId ?? null,
      chapter_id: chapterId ?? null,
    });
    setBusy(false);
    if (error) return toast.error("تعذر إرسال التعليق");
    setText(""); toast.success("تم إرسال التعليق"); onPosted();
  }
  return (
    <form onSubmit={submit} className="rounded-lg border border-border/40 bg-surface/40 p-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="اكتب تعليقك..."
        rows={3}
        className="w-full resize-none rounded-md border border-input bg-background/60 p-3 text-sm outline-none focus:border-primary"
      />
      <div className="mt-2 flex justify-end">
        <Button type="submit" disabled={busy || !text.trim()} size="sm" className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          {busy ? "جارٍ الإرسال..." : "إرسال"}
        </Button>
      </div>
    </form>
  );
}
