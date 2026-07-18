import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, Loader2 } from "lucide-react";
import { gmActivityFeed, type GmActivityItem } from "@/lib/gamification-api";

const KIND_LABELS: Record<string, string> = {
  read_chapter: "قرأ فصلاً",
  favorite: "أضاف إلى المفضلة",
  rate_novel: "قيّم رواية",
  comment: "علّق",
  review: "كتب مراجعة",
  follow_author: "تابع كاتباً",
  achievement_unlocked: "فتح إنجازاً",
  level_up: "وصل إلى مستوى جديد",
  chapter_published: "نشر فصلاً",
  novel_completed: "أنهى رواية",
};

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "الآن";
  if (s < 3600) return `${Math.floor(s / 60)} د`;
  if (s < 86400) return `${Math.floor(s / 3600)} س`;
  return `${Math.floor(s / 86400)} ي`;
}

export function ActivityFeed({ limit = 20 }: { limit?: number }) {
  const [items, setItems] = useState<GmActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem("favnol_activity_hidden") : null;
      setHidden(v === "1");
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (hidden) return;
    setLoading(true);
    void gmActivityFeed(limit).then((r) => { setItems(r); setLoading(false); });
  }, [hidden, limit]);

  function toggle() {
    const next = !hidden;
    setHidden(next);
    try { localStorage.setItem("favnol_activity_hidden", next ? "1" : "0"); } catch { /* ignore */ }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">نشاط الأصدقاء</h3>
        </div>
        <button onClick={toggle} className="text-[11px] text-muted-foreground hover:text-foreground">
          {hidden ? "إظهار" : "إخفاء"}
        </button>
      </div>

      {hidden ? (
        <p className="py-4 text-center text-xs text-muted-foreground">تم إخفاء التغذية</p>
      ) : loading ? (
        <div className="flex items-center justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">لا يوجد نشاط بعد — تابع كتّابك وأصدقاءك</p>
      ) : (
        <ul className="space-y-2">
          {items.map((a) => (
            <li key={a.id} className="flex items-center gap-3 rounded-lg bg-background/50 p-2">
              {a.actor_avatar_url ? (
                <img src={a.actor_avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="h-8 w-8 rounded-full bg-muted" />
              )}
              <div className="flex-1 text-xs">
                <div>
                  {a.actor_username ? (
                    <Link to="/authors/$username" params={{ username: a.actor_username }} className="font-bold hover:text-primary">
                      {a.actor_display_name ?? a.actor_username}
                    </Link>
                  ) : (
                    <span className="font-bold">{a.actor_display_name ?? "مستخدم"}</span>
                  )}
                  <span className="mx-1 text-muted-foreground">{KIND_LABELS[a.kind] ?? a.kind}</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">{timeAgo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
