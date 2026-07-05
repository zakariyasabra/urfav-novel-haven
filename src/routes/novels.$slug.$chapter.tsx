import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Sun, Moon, Type, List, Settings2 } from "lucide-react";
import { fetchChapter, fetchChapters, incrementChapterView, fetchComments } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/novels/$slug/$chapter")({
  component: ReaderPage,
  head: ({ params }) => ({
    meta: [{ title: `الفصل ${params.chapter} — ${params.slug} — UR Fav Novel` }],
  }),
});

type Theme = "dark" | "light" | "sepia";

function ReaderPage() {
  const { slug, chapter } = Route.useParams();
  const navigate = useNavigate();
  const chapterNum = parseInt(chapter, 10);
  const { user } = useAuth();

  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState<Theme>("dark");
  const [showToc, setShowToc] = useState(false);

  useEffect(() => {
    const fs = Number(localStorage.getItem("reader-fontsize") || 18); setFontSize(fs);
    const th = (localStorage.getItem("reader-theme") as Theme) || "dark"; setTheme(th);
  }, []);
  useEffect(() => { localStorage.setItem("reader-fontsize", String(fontSize)); }, [fontSize]);
  useEffect(() => { localStorage.setItem("reader-theme", theme); }, [theme]);

  const q = useQuery({ queryKey: ["chapter", slug, chapterNum], queryFn: () => fetchChapter(slug, chapterNum) });
  const chaptersQ = useQuery({
    queryKey: ["chapters", q.data?.novel.id],
    queryFn: () => fetchChapters(q.data!.novel.id),
    enabled: !!q.data?.novel.id,
  });

  useEffect(() => {
    if (q.data) {
      incrementChapterView(q.data.chapter.id);
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      // save reading progress
      if (user) {
        supabase.from("reading_history").upsert({
          user_id: user.id,
          novel_id: q.data.novel.id,
          chapter_id: q.data.chapter.id,
          last_read_at: new Date().toISOString(),
          progress: 0,
        }).then(() => {});
      }
    }
  }, [q.data?.chapter.id, user]);

  const commentsQ = useQuery({
    queryKey: ["comments", "chapter", q.data?.chapter.id],
    queryFn: () => fetchComments({ chapterId: q.data!.chapter.id }),
    enabled: !!q.data?.chapter.id,
  });

  if (q.isLoading) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">جاري التحميل…</div>;
  if (!q.data) return <div className="mx-auto max-w-3xl px-4 py-16 text-center">الفصل غير موجود</div>;

  const { novel, chapter: ch } = q.data;
  const chapters = chaptersQ.data ?? [];
  const idx = chapters.findIndex((c) => c.chapter_number === chapterNum);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx >= 0 && idx < chapters.length - 1 ? chapters[idx + 1] : null;

  const themeClass = theme === "light" ? "reading-light" : theme === "sepia" ? "reading-sepia" : "";

  return (
    <div className={themeClass}>
      <div className="min-h-screen bg-background">
        {/* Top bar */}
        <div className="sticky top-16 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2 text-sm">
            <Link to="/novels/$slug" params={{ slug }} className="truncate font-semibold text-primary hover:underline">{novel.title}</Link>
            <span className="text-muted-foreground">/</span>
            <span className="truncate text-muted-foreground">الفصل {chapterNum}</span>
            <div className="me-auto" />
            <ReaderControls fontSize={fontSize} setFontSize={setFontSize} theme={theme} setTheme={setTheme} onToc={() => setShowToc((s) => !s)} />
          </div>
          {showToc && (
            <div className="mx-auto max-h-72 max-w-3xl overflow-auto border-t border-border/40 bg-surface px-4 py-2">
              {chapters.map((c) => (
                <Link
                  key={c.id}
                  to="/novels/$slug/$chapter"
                  params={{ slug, chapter: String(c.chapter_number) }}
                  onClick={() => setShowToc(false)}
                  className={`block rounded px-2 py-1.5 text-sm ${c.chapter_number === chapterNum ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  الفصل {c.chapter_number} — {c.title}
                </Link>
              ))}
            </div>
          )}
        </div>

        <article className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="mb-8 text-center text-3xl font-black md:text-4xl">
            <span className="block text-sm font-normal text-muted-foreground">الفصل {chapterNum}</span>
            {ch.title}
          </h1>
          <div className="prose-reading whitespace-pre-line text-foreground/90" style={{ fontSize: `${fontSize}px` }}>
            {ch.content}
          </div>

          {/* Prev/Next */}
          <div className="mt-12 grid grid-cols-2 gap-3">
            <Button
              disabled={!prev}
              variant="outline"
              onClick={() => prev && navigate({ to: "/novels/$slug/$chapter", params: { slug, chapter: String(prev.chapter_number) } })}
              className="h-auto flex-col items-start py-3"
            >
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><ChevronRight className="h-4 w-4" />السابق</span>
              <span className="truncate text-sm font-bold">{prev ? `الفصل ${prev.chapter_number}` : "لا يوجد"}</span>
            </Button>
            <Button
              disabled={!next}
              onClick={() => next && navigate({ to: "/novels/$slug/$chapter", params: { slug, chapter: String(next.chapter_number) } })}
              className="h-auto flex-col items-start bg-gradient-to-r from-primary to-primary-glow py-3 text-primary-foreground"
            >
              <span className="flex items-center gap-1 text-xs opacity-90">التالي<ChevronLeft className="h-4 w-4" /></span>
              <span className="truncate text-sm font-bold">{next ? `الفصل ${next.chapter_number}` : "النهاية"}</span>
            </Button>
          </div>

          {/* Comments */}
          <div className="mt-12">
            <h2 className="mb-3 text-xl font-black">التعليقات</h2>
            <ChapterComments chapterId={ch.id} data={commentsQ.data ?? []} onPosted={() => commentsQ.refetch()} />
          </div>
        </article>
      </div>
    </div>
  );
}

function ReaderControls({ fontSize, setFontSize, theme, setTheme, onToc }: {
  fontSize: number; setFontSize: (n: number) => void; theme: Theme; setTheme: (t: Theme) => void; onToc: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="ghost" onClick={onToc} title="قائمة الفصول"><List className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={() => setOpen((v) => !v)} title="إعدادات"><Settings2 className="h-4 w-4" /></Button>
      {open && (
        <div className="absolute end-4 top-16 z-40 w-64 rounded-xl border border-border/60 bg-popover p-3 shadow-elevated">
          <div className="mb-3">
            <div className="mb-1 flex items-center justify-between text-xs font-semibold"><span><Type className="me-1 inline h-3 w-3" />حجم الخط</span><span>{fontSize}px</span></div>
            <input type="range" min={14} max={28} step={1} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-full accent-primary" />
          </div>
          <div>
            <div className="mb-1 text-xs font-semibold">السمة</div>
            <div className="grid grid-cols-3 gap-1">
              {(["dark", "light", "sepia"] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`rounded-md border p-2 text-xs ${theme === t ? "border-primary bg-primary/10 text-primary" : "border-border/60"}`}
                >
                  {t === "dark" ? <><Moon className="mx-auto mb-1 h-4 w-4" />داكن</> : t === "light" ? <><Sun className="mx-auto mb-1 h-4 w-4" />فاتح</> : <>📜<br />سيبيا</>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChapterComments({ chapterId, data, onPosted }: {
  chapterId: string;
  data: { id: string; content: string; created_at: string; profile: { username: string } | null }[];
  onPosted: () => void;
}) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from("comments").insert({ user_id: user.id, chapter_id: chapterId, content: text });
    if (error) return toast.error("تعذر النشر");
    setText(""); toast.success("تم النشر"); onPosted();
  }
  return (
    <div>
      {user ? (
        <form onSubmit={submit} className="rounded-lg border border-border/40 bg-surface/40 p-3">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="اكتب تعليقك على الفصل..." className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm outline-none focus:border-primary" />
          <div className="mt-2 flex justify-end">
            <Button size="sm" type="submit" disabled={!text.trim()} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">إرسال</Button>
          </div>
        </form>
      ) : (
        <div className="rounded-lg border border-border/40 bg-surface/40 p-3 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary">سجل دخول</Link> لإضافة تعليق
        </div>
      )}
      <div className="mt-3 space-y-2">
        {data.map((c) => (
          <div key={c.id} className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            <div className="mb-1 font-bold text-primary">{c.profile?.username ?? "مستخدم"}</div>
            <div className="text-foreground/90">{c.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
