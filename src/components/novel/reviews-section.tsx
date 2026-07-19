import { showError } from "@/lib/errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  fetchReviews,
  fetchRatingDistribution,
  fetchMyReview,
  upsertReview,
  toggleReviewLike,
} from "@/lib/social-api";
import { useAuth } from "@/hooks/use-auth";
import { timeAgoAr } from "@/lib/format";
import { Button } from "@/components/ui/button";

export function ReviewsSection({
  novelId,
  ratingAvg,
  ratingCount,
}: {
  novelId: string;
  ratingAvg: number;
  ratingCount: number;
}) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const reviewsQ = useQuery({
    queryKey: ["reviews", novelId],
    queryFn: () => fetchReviews(novelId),
  });
  const distQ = useQuery({
    queryKey: ["rating-dist", novelId],
    queryFn: () => fetchRatingDistribution(novelId),
  });
  const mineQ = useQuery({
    queryKey: ["my-review", novelId, user?.id],
    queryFn: () => fetchMyReview(novelId),
    enabled: !!user,
  });

  const [score, setScore] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const dist = distQ.data ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const total = Object.values(dist).reduce((a, b) => a + b, 0) || 1;

  async function submit() {
    if (!user) {
      toast.error("سجل الدخول");
      return;
    }
    if (score < 1) {
      toast.error("اختر تقييماً");
      return;
    }
    setBusy(true);
    try {
      await upsertReview({ novel_id: novelId, score, review_title: title, review_body: body });
      toast.success("تم نشر المراجعة");
      setTitle("");
      setBody("");
      setScore(0);
      qc.invalidateQueries({ queryKey: ["reviews", novelId] });
      qc.invalidateQueries({ queryKey: ["rating-dist", novelId] });
      qc.invalidateQueries({ queryKey: ["my-review", novelId, user.id] });
      qc.invalidateQueries({ queryKey: ["novel"] });
    } catch (e: unknown) {
      showError(e);
    }
    setBusy(false);
  }

  async function like(rid: string) {
    if (!user) {
      toast.error("سجل الدخول");
      return;
    }
    try {
      await toggleReviewLike(rid);
      qc.invalidateQueries({ queryKey: ["reviews", novelId] });
    } catch (e: unknown) {
      showError(e);
    }
  }

  return (
    <section className="mt-10">
      <h2 className="mb-4 text-2xl font-black">المراجعات والتقييمات</h2>

      {/* Distribution */}
      <div className="mb-6 grid gap-4 rounded-xl border border-border/40 bg-surface/40 p-4 md:grid-cols-[220px_1fr]">
        <div className="grid place-items-center gap-1 border-b border-border/40 pb-4 md:border-b-0 md:border-e md:pb-0 md:pe-4">
          <div className="text-5xl font-black text-primary">{Number(ratingAvg).toFixed(1)}</div>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <Star
                key={n}
                className={`h-4 w-4 ${n <= Math.round(ratingAvg) ? "fill-gold text-gold" : "text-muted-foreground"}`}
              />
            ))}
          </div>
          <div className="text-xs text-muted-foreground">{ratingCount} تقييم</div>
        </div>
        <div className="space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const c = dist[n] ?? 0;
            const pct = Math.round((c / total) * 100);
            return (
              <div key={n} className="flex items-center gap-2 text-xs">
                <span className="w-4 text-muted-foreground">{n}</span>
                <Star className="h-3 w-3 fill-gold text-gold" />
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-glow"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-10 text-end tabular-nums text-muted-foreground">{c}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Compose */}
      {user ? (
        <div className="mb-6 rounded-xl border border-border/40 bg-surface/40 p-4">
          <div className="mb-2 text-sm font-bold">
            {mineQ.data ? "تحديث مراجعتك" : "اكتب مراجعتك"}
          </div>
          <div className="mb-3 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                aria-label={`تقييم ${n}`}
                className="p-0.5"
              >
                <Star
                  className={`h-6 w-6 transition ${n <= score ? "fill-gold text-gold" : "text-muted-foreground hover:text-gold"}`}
                />
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            placeholder="عنوان المراجعة (اختياري)"
            className="mb-2 w-full rounded-md border border-input bg-background/60 p-2 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder="شاركنا رأيك بالتفصيل..."
            className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm outline-none focus:border-primary"
          />
          <div className="mt-2 flex justify-end">
            <Button
              onClick={submit}
              disabled={busy || score < 1}
              size="sm"
              className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
            >
              {busy ? "جارٍ النشر..." : mineQ.data ? "تحديث" : "نشر"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6 rounded-lg border border-border/40 bg-surface/40 p-3 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-bold text-primary">
            سجل دخول
          </Link>{" "}
          لكتابة مراجعة
        </div>
      )}

      {/* List */}
      <div className="space-y-3">
        {(reviewsQ.data ?? [])
          .filter((r) => r.review_body || r.review_title)
          .map((r) => (
            <article key={r.id} className="rounded-xl border border-border/40 bg-surface/50 p-4">
              <header className="mb-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/20 text-sm font-bold text-primary">
                    {(r.profile?.display_name ?? r.profile?.username ?? "?")
                      .slice(0, 1)
                      .toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold">
                      {r.profile?.display_name ?? r.profile?.username ?? "مستخدم"}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`h-3 w-3 ${n <= r.score ? "fill-gold text-gold" : "text-muted-foreground"}`}
                        />
                      ))}
                      <span className="ms-1 text-[11px] text-muted-foreground">
                        · {timeAgoAr(r.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => like(r.id)}
                  className="flex items-center gap-1 rounded-full border border-border/60 px-2 py-1 text-xs hover:border-primary hover:text-primary"
                >
                  <ThumbsUp className="h-3 w-3" /> {r.likes_count}
                </button>
              </header>
              {r.review_title && <div className="mb-1 text-sm font-bold">{r.review_title}</div>}
              {r.review_body && (
                <p className="whitespace-pre-line text-sm text-foreground/85">{r.review_body}</p>
              )}
            </article>
          ))}
        {reviewsQ.data &&
          reviewsQ.data.filter((r) => r.review_body || r.review_title).length === 0 && (
            <div className="rounded-lg border border-border/40 bg-surface/40 p-6 text-center text-sm text-muted-foreground">
              لا توجد مراجعات بعد. كن أول من يكتب مراجعة.
            </div>
          )}
      </div>
    </section>
  );
}
