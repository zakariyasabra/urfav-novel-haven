import { showError } from "@/lib/errors";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Pencil, BookOpen, Layers, Users, MessageSquare, BarChart3, X, UserCheck, Flag, Tag as TagIcon, Settings as SettingsIcon, LayoutGrid, Megaphone, FileText, CreditCard, History, Coins, Crown, Languages, LifeBuoy, Lightbulb } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { translateContent } from "@/lib/translate.functions";
import { useAuth } from "@/hooks/use-auth";
import { useT } from "@/i18n/provider";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchNovels, fetchChapters, fetchGenres } from "@/lib/api";
import { coverUrl } from "@/lib/covers";
import { statusLabel, formatViews } from "@/lib/format";
import { fetchAllApplications, approveApplication, rejectApplication } from "@/lib/author-api";
import { ReportsTab } from "@/components/admin/reports-tab";
import { TagsTab } from "@/components/admin/tags-tab";
import { SettingsTab } from "@/components/admin/settings-tab";
import { HomepageBuilderTab } from "@/components/admin/homepage-builder-tab";
import { AdsTab } from "@/components/admin/ads-tab";
import { CmsTab } from "@/components/admin/cms-tab";
import { UsersTab } from "@/components/admin/users-tab";
import { PaymentsTab } from "@/components/admin/payments-tab";
import { CoinPackagesTab } from "@/components/admin/coin-packages-tab";
import { VipPlansTab } from "@/components/admin/vip-plans-tab";
import { AuditLogTab } from "@/components/admin/audit-log-tab";
import { DashboardStats } from "@/components/admin/dashboard-stats";
import { SupportTab } from "@/components/admin/support-tab";
import { FeatureRequestsTab } from "@/components/admin/feature-requests-tab";
import { BroadcastDialog } from "@/components/admin/broadcast-dialog";
import { LivePresence } from "@/components/admin/live-dashboard";
import { confirmDialog, promptDialog } from "@/components/ui/dialog-service";
import { SystemTab } from "@/components/admin/system-tab";
import { Server } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin Dashboard — FAVNOL" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, isSuperAdmin, loading } = useAuth();
  const nav = useNavigate();
  const t = useT();
  const [tab, setTab] = useState<"stats" | "novels" | "chapters" | "authors" | "users" | "comments" | "reports" | "tags" | "homepage" | "ads" | "cms" | "payments" | "coin-packages" | "vip-plans" | "audit" | "settings" | "support" | "feature-requests" | "system">("stats");

  useEffect(() => { if (!loading && !isAdmin) nav({ to: "/403", replace: true }); }, [loading, isAdmin, nav]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="h-9 w-64 animate-pulse rounded bg-surface/60" />
        <div className="mt-6 h-12 w-full animate-pulse rounded-lg bg-surface/60" />
        <div className="mt-6 h-64 w-full animate-pulse rounded-lg bg-surface/60" />
      </div>
    );
  }
  if (!isAdmin) return null;

  // Tabs visible to a plain Admin. Super-Admin-only tabs (users, audit, settings) are stripped for non-super admins.
  const allTabs = [
    { key: "stats", label: t("admin.tab.stats"), icon: BarChart3, superOnly: false },
    { key: "novels", label: t("admin.tab.novels"), icon: BookOpen, superOnly: false },
    { key: "chapters", label: t("admin.tab.chapters"), icon: Layers, superOnly: false },
    { key: "authors", label: t("admin.tab.authors"), icon: UserCheck, superOnly: false },
    { key: "users", label: t("admin.tab.users"), icon: Users, superOnly: true },
    { key: "comments", label: t("admin.tab.comments"), icon: MessageSquare, superOnly: false },
    { key: "reports", label: t("admin.tab.reports"), icon: Flag, superOnly: false },
    { key: "support", label: t("admin.tab.support"), icon: LifeBuoy, superOnly: false },
    { key: "feature-requests", label: t("admin.tab.featureRequests"), icon: Lightbulb, superOnly: false },
    { key: "tags", label: t("admin.tab.tags"), icon: TagIcon, superOnly: false },
    { key: "homepage", label: t("admin.tab.homepage"), icon: LayoutGrid, superOnly: false },
    { key: "ads", label: t("admin.tab.ads"), icon: Megaphone, superOnly: true },
    { key: "cms", label: t("admin.tab.cms"), icon: FileText, superOnly: false },
    { key: "payments", label: t("admin.tab.payments"), icon: CreditCard, superOnly: false },
    { key: "coin-packages", label: t("admin.tab.coinPackages"), icon: Coins, superOnly: true },
    { key: "vip-plans", label: t("admin.tab.vipPlans"), icon: Crown, superOnly: true },
    { key: "audit", label: t("admin.tab.audit"), icon: History, superOnly: true },
    { key: "settings", label: t("admin.tab.settings"), icon: SettingsIcon, superOnly: true },
    { key: "system", label: t("admin.tab.system"), icon: Server, superOnly: true },
  ] as const;
  const tabs = allTabs.filter(t => !t.superOnly || isSuperAdmin);
  // If a non-super admin somehow lands on a super-only tab, snap back to stats.
  const superOnly = new Set(allTabs.filter(t => t.superOnly).map(t => t.key));
  const activeTab = (!isSuperAdmin && superOnly.has(tab as never)) ? "stats" : tab;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
      <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 md:mb-6">
        <h1 className="truncate text-2xl font-black sm:text-3xl md:text-4xl">{t("admin.title")}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <LivePresence />
          {isSuperAdmin && <BroadcastDialog />}
        </div>
      </div>
      <div className="mb-6 -mx-4 overflow-x-auto px-4 no-scrollbar md:mx-0 md:px-0">
        <div className="inline-flex min-w-full gap-1 rounded-lg border border-border/60 bg-surface/40 p-1 md:flex md:flex-wrap">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as typeof tab)}
              className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors ${activeTab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" />{label}
            </button>
          ))}
        </div>
      </div>


      {activeTab === "stats" && <DashboardStats />}
      {activeTab === "novels" && <NovelsTab />}
      {activeTab === "chapters" && <ChaptersTab />}
      {activeTab === "authors" && <AuthorsTab />}
      {activeTab === "users" && isSuperAdmin && <UsersTab />}
      {activeTab === "comments" && <CommentsTab />}
      {activeTab === "reports" && <ReportsTab />}
      {activeTab === "support" && <SupportTab />}
      {activeTab === "feature-requests" && <FeatureRequestsTab />}
      {activeTab === "tags" && <TagsTab />}
      {activeTab === "homepage" && <HomepageBuilderTab />}
      {activeTab === "ads" && isSuperAdmin && <AdsTab />}
      {activeTab === "cms" && <CmsTab />}
      {activeTab === "payments" && <PaymentsTab />}
      {activeTab === "coin-packages" && isSuperAdmin && <CoinPackagesTab />}
      {activeTab === "vip-plans" && isSuperAdmin && <VipPlansTab />}
      {activeTab === "audit" && isSuperAdmin && <AuditLogTab />}
      {activeTab === "settings" && isSuperAdmin && <SettingsTab />}
      {activeTab === "system" && isSuperAdmin && <SystemTab />}
    </div>
  );
}

function AuthorsTab() {
  const qc = useQueryClient();
  const t = useT();
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "">("pending");
  const q = useQuery({ queryKey: ["author-applications", filter], queryFn: () => fetchAllApplications(filter || undefined) });

  async function act(id: string, kind: "approve" | "reject") {
    const note = kind === "reject" ? ((await promptDialog({ title: t("admin.authors.rejectReason"), multiline: true })) ?? undefined) : undefined;
    try {
      if (kind === "approve") await approveApplication(id, note);
      else await rejectApplication(id, note);
      toast.success(t("admin.authors.done"));
      qc.invalidateQueries({ queryKey: ["author-applications"] });
    } catch (e) { showError(e); }
  }

  const filterLabel = (s: "pending" | "approved" | "rejected" | "") =>
    s === "" ? t("admin.authors.filter.all") :
    s === "pending" ? t("admin.authors.filter.pending") :
    s === "approved" ? t("admin.authors.filter.approved") :
    t("admin.authors.filter.rejected");
  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["pending", "approved", "rejected", ""] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold ${filter === s ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}>
            {filterLabel(s)}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {(q.data ?? []).map((a) => (
          <div key={a.id} className="rounded-xl border border-border/40 bg-surface/40 p-4">
            <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="min-w-0">
                <div className="truncate font-bold">{a.pen_name}</div>
                <div className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
              </div>
              <div className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${
                a.status === "pending" ? "bg-amber-500/20 text-amber-500" :
                a.status === "approved" ? "bg-emerald-500/20 text-emerald-500" :
                "bg-destructive/20 text-destructive"
              }`}>
                {a.status === "pending" ? t("admin.authors.filter.pending") : a.status === "approved" ? t("admin.authors.filter.approved") : t("admin.authors.filter.rejected")}
              </div>
            </div>
            <p className="mb-2 text-sm text-muted-foreground whitespace-pre-wrap">{a.bio}</p>
            {a.sample_work && (
              <details className="mb-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">{t("admin.authors.sampleWork")}</summary>
                <p className="mt-2 whitespace-pre-wrap">{a.sample_work}</p>
              </details>
            )}
            {a.admin_note && <div className="mb-2 text-xs text-muted-foreground">{t("admin.authors.note", { note: a.admin_note })}</div>}
            {a.status === "pending" && (
              <div className="flex gap-2">
                <Button size="sm" onClick={() => act(a.id, "approve")}>{t("admin.authors.approve")}</Button>
                <Button size="sm" variant="destructive" onClick={() => act(a.id, "reject")}>{t("admin.authors.reject")}</Button>
              </div>
            )}
          </div>
        ))}
        {q.data?.length === 0 && <div className="rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">{t("admin.authors.empty")}</div>}
      </div>
    </div>
  );
}


function StatsTab() {
  const t = useT();
  const q = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [novels, chapters, users, comments] = await Promise.all([
        supabase.from("novels").select("*", { count: "exact", head: true }),
        supabase.from("chapters").select("*", { count: "exact", head: true }),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
      ]);
      return {
        novels: novels.count ?? 0,
        chapters: chapters.count ?? 0,
        users: users.count ?? 0,
        comments: comments.count ?? 0,
      };
    },
  });
  const stats = q.data;
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <Stat label={t("admin.stats.novels")} value={stats?.novels ?? 0} icon={<BookOpen />} />
      <Stat label={t("admin.stats.chapters")} value={stats?.chapters ?? 0} icon={<Layers />} />
      <Stat label={t("admin.stats.users")} value={stats?.users ?? 0} icon={<Users />} />
      <Stat label={t("admin.stats.comments")} value={stats?.comments ?? 0} icon={<MessageSquare />} />
    </div>
  );
}
function Stat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-surface/40 p-6">
      <div className="mb-2 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</div>
      <div className="text-3xl font-black">{formatViews(value)}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

function NovelsTab() {
  const qc = useQueryClient();
  const t = useT();
  const q = useQuery({ queryKey: ["admin-novels"], queryFn: () => fetchNovels({ sort: "newest" }) });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const translateFn = useServerFn(translateContent);
  const [translating, setTranslating] = useState<string | null>(null);

  async function del(id: string) {
    if (!(await confirmDialog({ title: t("admin.confirm.title"), body: t("admin.confirm.deleteNovel"), confirmLabel: t("admin.confirm.confirmLabel"), danger: true }))) return;
    const { error } = await supabase.from("novels").delete().eq("id", id);
    if (error) return toast.error(t("admin.toast.deleteFailed"));
    toast.success(t("admin.toast.deleted")); qc.invalidateQueries({ queryKey: ["admin-novels"] });
  }

  async function aiTranslate(id: string) {
    setTranslating(id);
    try {
      await translateFn({ data: { entity_type: "novel", entity_id: id, fields: ["title", "description", "author_display", "original_title", "translator"], target_lang: "en" } });
      toast.success(t("admin.ai.translated") || "تمت الترجمة");
      qc.invalidateQueries({ queryKey: ["admin-novels"] });
    } catch (e) {
      showError(e);
    } finally {
      setTranslating(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing("new")} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"><Plus className="me-1 h-4 w-4" />{t("admin.novels.new")}</Button>
      </div>
      <div className="space-y-3">
        {(q.data ?? []).map((n) => (
          <div key={n.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3 sm:grid-cols-[80px_minmax(0,1fr)_auto]">
            <img src={coverUrl(n.cover_url)} alt="" className="h-20 w-14 rounded object-cover sm:w-20" />
            <div className="min-w-0">
              <div className="truncate font-bold">{n.title}</div>
              <div className="truncate text-xs text-muted-foreground">{n.author} · {statusLabel(n.status)} · {formatViews(n.views_count)} {t("admin.novels.viewsSuffix")}</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => aiTranslate(n.id)} disabled={translating === n.id} aria-label={t("admin.ai.translate") || "ترجمة AI"}>
                <Languages className={`h-4 w-4 ${translating === n.id ? "animate-pulse" : ""}`} />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(n.id)} aria-label={t("admin.action.edit") as string}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => del(n.id)} aria-label={t("admin.action.delete") as string}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <NovelForm
          novelId={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["admin-novels"] }); }}
        />
      )}
    </div>
  );
}

function NovelForm({ novelId, onClose }: { novelId: string | null; onClose: () => void }) {
  const t = useT();
  const [form, setForm] = useState({
    slug: "", title: "", author: "", translator: "", cover_url: "", description: "",
    status: "ongoing", is_featured: false,
  });
  const [genres, setGenres] = useState<string[]>([]);
  const allGenres = useQuery({ queryKey: ["genres"], queryFn: fetchGenres });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!novelId) return;
    supabase.from("novels").select("*, novel_genres(genre_id)").eq("id", novelId).maybeSingle().then(({ data }) => {
      if (!data) return;
      const d = data as unknown as { slug: string; title: string; author: string; translator: string | null; cover_url: string | null; description: string; status: string; is_featured: boolean; novel_genres: { genre_id: string }[] };
      setForm({
        slug: d.slug, title: d.title, author: d.author, translator: d.translator ?? "",
        cover_url: d.cover_url ?? "", description: d.description, status: d.status, is_featured: d.is_featured,
      });
      setGenres(d.novel_genres.map((g) => g.genre_id));
    });
  }, [novelId]);

  async function save() {
    setBusy(true);
    const payload = { ...form, status: form.status as "ongoing" | "completed" | "hiatus" };
    let id = novelId;
    if (novelId) {
      const { error } = await supabase.from("novels").update(payload).eq("id", novelId);
      if (error) { setBusy(false); return showError(error); }
    } else {
      const { data, error } = await supabase.from("novels").insert(payload).select("id").maybeSingle();
      if (error || !data) { setBusy(false); return showError(error); }
      id = data.id;
    }
    // sync genres
    if (id) {
      await supabase.from("novel_genres").delete().eq("novel_id", id);
      if (genres.length) {
        await supabase.from("novel_genres").insert(genres.map((g) => ({ novel_id: id!, genre_id: g })));
      }
    }
    setBusy(false);
    toast.success(t("admin.toast.saved"));
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black">{novelId ? t("admin.novels.editTitleModal") : t("admin.novels.new")}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Input label={t("admin.form.slug") as string} value={form.slug} onChange={(v) => setForm({ ...form, slug: v })} />
          <Input label={t("admin.form.title") as string} value={form.title} onChange={(v) => setForm({ ...form, title: v })} />
          <Input label={t("admin.form.author") as string} value={form.author} onChange={(v) => setForm({ ...form, author: v })} />
          <Input label={t("admin.form.translator") as string} value={form.translator} onChange={(v) => setForm({ ...form, translator: v })} />
          <Input label={t("admin.form.coverUrl") as string} value={form.cover_url} onChange={(v) => setForm({ ...form, cover_url: v })} />
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("admin.form.status")}</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
              <option value="ongoing">{t("admin.form.status.ongoing") as string}</option>
              <option value="completed">{t("admin.form.status.completed") as string}</option>
              <option value="hiatus">{t("admin.form.status.hiatus") as string}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">{t("admin.form.description")}</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} className="w-full resize-none rounded-md border border-input bg-background/60 p-3 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">{t("admin.form.genres")}</label>
            <div className="flex flex-wrap gap-2">
              {(allGenres.data ?? []).map((g) => {
                const on = genres.includes(g.id);
                return (
                  <button key={g.id} type="button" onClick={() => setGenres(on ? genres.filter((x) => x !== g.id) : [...genres, g.id])}
                    className={`rounded-md border px-2 py-1 text-xs ${on ? "border-primary bg-primary/20 text-primary" : "border-border/60"}`}>
                    {g.name_ar}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} />
            <span className="text-sm">{t("admin.form.featured")}</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={busy} onClick={save} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">{t("common.save")}</Button>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function ChaptersTab() {
  const qc = useQueryClient();
  const t = useT();
  const novelsQ = useQuery({ queryKey: ["admin-novels"], queryFn: () => fetchNovels({ sort: "newest" }) });
  const [novelId, setNovelId] = useState<string>("");
  const chaptersQ = useQuery({ queryKey: ["chapters", novelId], queryFn: () => fetchChapters(novelId), enabled: !!novelId });
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const translateFn = useServerFn(translateContent);
  const [translating, setTranslating] = useState<string | null>(null);

  useEffect(() => { if (!novelId && novelsQ.data?.[0]) setNovelId(novelsQ.data[0].id); }, [novelsQ.data]);

  async function del(id: string) {
    if (!(await confirmDialog({ title: t("admin.confirm.title"), body: t("admin.confirm.deleteChapter"), confirmLabel: t("admin.confirm.confirmLabel"), danger: true }))) return;
    const { error } = await supabase.from("chapters").delete().eq("id", id);
    if (error) return toast.error(t("admin.toast.deleteFailed"));
    toast.success(t("admin.toast.deleted")); qc.invalidateQueries({ queryKey: ["chapters", novelId] });
  }

  async function aiTranslate(id: string) {
    setTranslating(id);
    try {
      await translateFn({ data: { entity_type: "chapter", entity_id: id, fields: ["title", "content"], target_lang: "en" } });
      toast.success(t("admin.ai.translated") || "تمت الترجمة");
      qc.invalidateQueries({ queryKey: ["chapters", novelId] });
    } catch (e) {
      showError(e);
    } finally {
      setTranslating(null);
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select value={novelId} onChange={(e) => setNovelId(e.target.value)} className="h-10 min-w-0 max-w-full flex-1 rounded-md border border-input bg-background/60 px-3 text-sm sm:flex-none">
          {(novelsQ.data ?? []).map((n) => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>
        <Button onClick={() => setEditing("new")} disabled={!novelId} className="shrink-0 bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"><Plus className="me-1 h-4 w-4" />{t("admin.chapters.new")}</Button>
      </div>
      <div className="space-y-2">
        {(chaptersQ.data ?? []).map((c) => (
          <div key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3">
            <div className="min-w-0">
              <div className="truncate font-bold">{t("admin.chapters.rowTitle", { n: c.chapter_number, title: c.title })}</div>
              <div className="text-xs text-muted-foreground">{formatViews(c.views_count)} {t("admin.novels.viewsSuffix")}</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => aiTranslate(c.id)} disabled={translating === c.id} aria-label={t("admin.ai.translate") || "ترجمة AI"}>
                <Languages className={`h-4 w-4 ${translating === c.id ? "animate-pulse" : ""}`} />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(c.id)} aria-label={t("admin.action.edit") as string}><Pencil className="h-4 w-4" /></Button>
              <Button size="sm" variant="outline" onClick={() => del(c.id)} aria-label={t("admin.action.delete") as string}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      {editing && novelId && (
        <ChapterForm
          novelId={novelId}
          chapterId={editing === "new" ? null : editing}
          onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["chapters", novelId] }); }}
        />
      )}
    </div>
  );
}

function ChapterForm({ novelId, chapterId, onClose }: { novelId: string; chapterId: string | null; onClose: () => void }) {
  const t = useT();
  const [form, setForm] = useState({ chapter_number: 1, title: "", content: "", is_vip: false });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!chapterId) return;
    supabase.from("chapters").select("*").eq("id", chapterId).maybeSingle().then(({ data }) => {
      if (data) setForm({ chapter_number: data.chapter_number, title: data.title, content: data.content, is_vip: data.is_vip });
    });
  }, [chapterId]);

  async function save() {
    setBusy(true);
    if (chapterId) {
      const { error } = await supabase.from("chapters").update(form).eq("id", chapterId);
      if (error) { setBusy(false); return showError(error); }
    } else {
      const { error } = await supabase.from("chapters").insert({ ...form, novel_id: novelId });
      if (error) { setBusy(false); return showError(error); }
    }
    setBusy(false); toast.success(t("admin.toast.saved")); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-3xl overflow-auto rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-black">{chapterId ? t("admin.chapters.editTitle") : t("admin.chapters.new")}</h3>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="grid gap-3">
          <div className="grid gap-3 md:grid-cols-3">
            <Input label={t("admin.chapters.number") as string} value={String(form.chapter_number)} onChange={(v) => setForm({ ...form, chapter_number: Number(v) || 0 })} />
            <div className="md:col-span-2"><Input label={t("admin.form.title") as string} value={form.title} onChange={(v) => setForm({ ...form, title: v })} /></div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("admin.chapters.content")}</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={16} className="w-full resize-y rounded-md border border-input bg-background/60 p-3 font-serif text-sm leading-loose" />
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_vip} onChange={(e) => setForm({ ...form, is_vip: e.target.checked })} />
            <span className="text-sm">{t("admin.chapters.vip")}</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>{t("common.cancel")}</Button>
          <Button disabled={busy} onClick={save} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">{t("common.save")}</Button>
        </div>
      </div>
    </div>
  );
}

// UsersTab moved to components/admin/users-tab.tsx (comprehensive management)

function CommentsTab() {
  const qc = useQueryClient();
  const t = useT();
  const q = useQuery({
    queryKey: ["admin-comments"],
    queryFn: async () => {
      const { data } = await supabase.from("comments").select("id,content,created_at,profile:profiles(username), novel:novels(title,slug)").order("created_at", { ascending: false }).limit(100);
      return (data ?? []) as unknown as { id: string; content: string; created_at: string; profile: { username: string } | null; novel: { title: string; slug: string } | null }[];
    },
  });
  async function del(id: string) {
    if (!(await confirmDialog({ title: t("admin.confirm.title"), body: t("admin.confirm.deleteComment"), confirmLabel: t("admin.confirm.confirmLabel"), danger: true }))) return;
    const { error } = await supabase.from("comments").delete().eq("id", id);
    if (error) return toast.error(t("admin.toast.deleteFailed"));
    toast.success(t("admin.toast.deleted")); qc.invalidateQueries({ queryKey: ["admin-comments"] });
  }
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((c) => (
        <div key={c.id} className="rounded-lg border border-border/40 bg-surface/40 p-3">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>{t("admin.comments.onNovel", { user: c.profile?.username ?? "", novel: c.novel?.title ?? "" })}</span>
            <Button size="sm" variant="outline" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <div className="text-sm">{c.content}</div>
        </div>
      ))}
    </div>
  );
}
