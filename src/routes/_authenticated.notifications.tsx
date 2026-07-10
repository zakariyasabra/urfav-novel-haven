import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2, BookOpen, Heart, MessageCircle, Crown, ShieldAlert, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { timeAgoAr } from "@/lib/format";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "التنبيهات — UR Fav Novel" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  new_chapter: BookOpen,
  author_upload: BookOpen,
  reply: MessageCircle,
  like: Heart,
  comment: MessageCircle,
  vip_expiring: Crown,
  subscription: Crown,
  admin_message: ShieldAlert,
  announcement: Megaphone,
  author_approved: BookOpen,
  author_rejected: ShieldAlert,
};

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications")
        .select("id,type,title,body,link,is_read,created_at")
        .eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  async function markAllRead() {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    toast.success("تم"); qc.invalidateQueries({ queryKey: ["notifications", user.id] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }
  async function markRead(id: string) {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }
  async function del(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  const items = q.data ?? [];
  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <Bell className="h-6 w-6 text-primary" />التنبيهات
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{unread > 0 ? `${unread} غير مقروء` : "كل شيء محدّث"}</p>
        </div>
        {unread > 0 && (
          <Button size="sm" variant="secondary" onClick={markAllRead}>
            <Check className="me-1 h-4 w-4" />تعليم الكل كمقروء
          </Button>
        )}
      </header>

      {q.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border/40 bg-surface/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <div className="text-base font-bold">لا تنبيهات بعد</div>
          <p className="mt-1 text-sm text-muted-foreground">سيصلك هنا كل ما هو جديد.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICONS[n.type] ?? Bell;
            const body = (
              <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-3 transition-all ${n.is_read ? "border-border/40 bg-surface/30" : "border-primary/40 bg-primary/[0.06]"}`}>
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.is_read ? "bg-secondary" : "bg-primary/20 text-primary"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{n.title}</div>
                  {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 text-[11px] text-muted-foreground">{timeAgoAr(n.created_at)}</div>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.is_read && (
                    <button onClick={(e) => { e.preventDefault(); markRead(n.id); }} className="grid h-7 w-7 place-items-center rounded-full text-primary hover:bg-primary/10" title="تعليم كمقروء">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button onClick={(e) => { e.preventDefault(); del(n.id); }} className="grid h-7 w-7 place-items-center rounded-full text-destructive hover:bg-destructive/10" title="حذف">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => !n.is_read && markRead(n.id)} className="block">{body}</Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
