import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2, BookOpen, Heart, MessageCircle, Crown, ShieldAlert, Megaphone, Search, Archive, Coins, Store, Sparkles, FolderHeart, Users, UserRound, CreditCard, Shield, Cog, Gamepad2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useTimeAgo } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/provider";
import {
  listInbox,
  unreadCountsByCategory,
  markAllRead,
  archiveNotification,
  markOneRead,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationRow,
} from "@/lib/notification-center-api";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsPage,
});

const CAT_ICON: Record<NotificationCategory, React.ComponentType<{ className?: string }>> = {
  reading: BookOpen, marketplace: Store, battle_pass: Gamepad2, ai: Sparkles,
  collections: FolderHeart, followers: Users, authors: UserRound,
  payments: CreditCard, admin: Shield, system: Cog,
};

const LEGACY_TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  new_chapter: BookOpen, author_upload: BookOpen, reply: MessageCircle, like: Heart, comment: MessageCircle,
  vip_expiring: Crown, subscription: Crown, admin_message: ShieldAlert, announcement: Megaphone,
  author_approved: BookOpen, author_rejected: ShieldAlert, tip: Coins, donation: Coins,
};

const CAT_LABEL_AR: Record<NotificationCategory, string> = {
  reading: "القراءة", marketplace: "المتجر", battle_pass: "التحديات والمواسم", ai: "الذكاء الاصطناعي",
  collections: "المجموعات", followers: "المتابعون", authors: "المؤلفون",
  payments: "المدفوعات", admin: "الإدارة", system: "النظام",
};

function NotificationsPage() {
  const t = useT();
  const timeAgo = useTimeAgo();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [cat, setCat] = useState<NotificationCategory | "all">("all");
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");
  const [search, setSearch] = useState("");

  const listQ = useQuery({
    queryKey: ["inbox", user?.id, cat, filter, search],
    queryFn: () => listInbox({ category: cat, filter, search }),
    enabled: !!user,
  });

  const countsQ = useQuery({
    queryKey: ["inbox-counts", user?.id],
    queryFn: unreadCountsByCategory,
    enabled: !!user,
    staleTime: 30_000,
  });

  const items: NotificationRow[] = useMemo(() => {
    const lang = (typeof window !== "undefined" && window.localStorage.getItem("urfav_lang") === "en") ? "en" : "ar";
    return (listQ.data ?? []).map((r) => ({
      ...r,
      title: (lang === "en" ? r.title_en?.trim() || r.title_ar || r.title : r.title_ar?.trim() || r.title) || r.title,
      body:  (lang === "en" ? r.body_en?.trim()  || r.body_ar  || r.body  : r.body_ar?.trim()  || r.body ) || r.body,
    }));
  }, [listQ.data]);

  const totalUnread = useMemo(() => {
    const c = countsQ.data;
    if (!c) return 0;
    return NOTIFICATION_CATEGORIES.reduce((s, k) => s + (c[k] || 0), 0);
  }, [countsQ.data]);

  async function handleMarkAllRead() {
    try {
      await markAllRead(cat === "all" ? undefined : cat);
      toast.success(t("common.done"));
      qc.invalidateQueries({ queryKey: ["inbox"] });
      qc.invalidateQueries({ queryKey: ["inbox-counts"] });
      qc.invalidateQueries({ queryKey: ["notifications-count"] });
    } catch (e) {
      toast.error(String((e as Error).message));
    }
  }

  async function handleArchive(id: string) {
    await archiveNotification(id);
    qc.invalidateQueries({ queryKey: ["inbox"] });
    qc.invalidateQueries({ queryKey: ["inbox-counts"] });
  }

  async function handleDelete(id: string) {
    await supabase.from("notifications").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["inbox"] });
    qc.invalidateQueries({ queryKey: ["inbox-counts"] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  async function handleMarkRead(id: string) {
    await markOneRead(id);
    qc.invalidateQueries({ queryKey: ["inbox"] });
    qc.invalidateQueries({ queryKey: ["inbox-counts"] });
    qc.invalidateQueries({ queryKey: ["notifications-count"] });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black md:text-3xl">
            <Bell className="h-6 w-6 text-primary" />{t("notif.title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalUnread > 0 ? t("notif.unread", { n: totalUnread }) : t("notif.uptodate")}
          </p>
        </div>
        {totalUnread > 0 && (
          <Button size="sm" variant="secondary" onClick={handleMarkAllRead}>
            <Check className="me-1 h-4 w-4" />{t("notif.markAllRead")}
          </Button>
        )}
      </header>

      {/* Category chips */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <CategoryChip active={cat === "all"} onClick={() => setCat("all")} label={t("common.all") || "الكل"} count={totalUnread} />
        {NOTIFICATION_CATEGORIES.map((c) => {
          const Icon = CAT_ICON[c];
          return (
            <CategoryChip
              key={c}
              active={cat === c}
              onClick={() => setCat(c)}
              label={CAT_LABEL_AR[c]}
              count={countsQ.data?.[c] ?? 0}
              icon={<Icon className="h-3.5 w-3.5" />}
            />
          );
        })}
      </div>

      {/* Search + filter */}
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute inset-y-0 start-3 my-auto h-4 w-4 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("common.search") || "بحث"}
            className="w-full rounded-lg border border-border/60 bg-surface/60 px-3 ps-9 py-2 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="inline-flex items-center rounded-lg border border-border/60 bg-surface/60">
          {(["all", "unread", "archived"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-bold transition-colors ${filter === f ? "bg-primary text-primary-foreground rounded-lg" : "text-muted-foreground hover:text-foreground"}`}
            >
              {f === "all" ? (t("common.all") || "الكل") : f === "unread" ? (t("notif.filter.unread") || "غير مقروء") : (t("notif.filter.archived") || "المؤرشف")}
            </button>
          ))}
        </div>
      </div>

      {listQ.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl border border-border/40 bg-surface/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/60 bg-surface/30 p-12 text-center">
          <Bell className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <div className="text-base font-bold">{t("notif.empty.t")}</div>
          <p className="mt-1 text-sm text-muted-foreground">{t("notif.empty.h")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = LEGACY_TYPE_ICON[n.type] ?? CAT_ICON[n.category] ?? Bell;
            const isArchived = !!n.archived_at;
            const body = (
              <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 rounded-xl border p-3 transition-all ${n.is_read ? "border-border/40 bg-surface/30" : "border-primary/40 bg-primary/[0.06]"} ${isArchived ? "opacity-70" : ""}`}>
                <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${n.is_read ? "bg-secondary" : "bg-primary/20 text-primary"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{n.title}</div>
                  {n.body && <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</div>}
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full bg-secondary/40 px-2 py-0.5">{CAT_LABEL_AR[n.category]}</span>
                    <span>{timeAgo(n.created_at)}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.is_read && !isArchived && (
                    <button onClick={(e) => { e.preventDefault(); handleMarkRead(n.id); }} className="grid h-7 w-7 place-items-center rounded-full text-primary hover:bg-primary/10" title={t("notif.markRead")} aria-label={t("notif.markRead")}>
                      <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!isArchived ? (
                    <button onClick={(e) => { e.preventDefault(); handleArchive(n.id); }} className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:bg-secondary" title={t("notif.archive") || "أرشفة"} aria-label={t("notif.archive") || "أرشفة"}>
                      <Archive className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button onClick={(e) => { e.preventDefault(); handleDelete(n.id); }} className="grid h-7 w-7 place-items-center rounded-full text-destructive hover:bg-destructive/10" title={t("common.delete")} aria-label={t("common.delete")}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
            return n.link ? (
              <Link key={n.id} to={n.link} onClick={() => !n.is_read && handleMarkRead(n.id)} className="block">{body}</Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ active, onClick, label, count, icon }: { active: boolean; onClick: () => void; label: string; count: number; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors ${active ? "border-primary bg-primary/15 text-primary" : "border-border/60 bg-surface/50 text-muted-foreground hover:text-foreground"}`}
    >
      {icon}
      <span>{label}</span>
      {count > 0 && <span className={`grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] ${active ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>{count}</span>}
    </button>
  );
}
