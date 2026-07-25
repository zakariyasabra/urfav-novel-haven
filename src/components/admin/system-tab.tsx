import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  Activity,
  FileText,
  HardDrive,
  Clock,
  ShieldAlert,
  Search,
  Download,
  Mail,
  Star,
  Trash2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT, usePreferences } from "@/i18n/provider";
import { showError } from "@/lib/errors";
import {
  fetchSystemHealth,
  fetchSystemLogs,
  fetchStorageStats,
  fetchCronJobs,
  toggleCron,
  fetchSpamWords,
  addSpamWord,
  removeSpamWord,
  fetchSeoOverrides,
  upsertSeo,
  deleteSeo,
  type SeoOverride,
  exportTable,
  fetchIoJobs,
  fetchEmailTemplates,
  upsertEmailTemplate,
  deleteEmailTemplate,
  fetchFeedback,
} from "@/lib/enterprise-api";
import { promptDialog, confirmDialog } from "@/components/ui/dialog-service";

type SubTab = "health" | "logs" | "storage" | "cron" | "spam" | "seo" | "io" | "email" | "feedback";

export function SystemTab() {
  const t = useT();
  const [sub, setSub] = useState<SubTab>("health");
  const tabs: { key: SubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] =
    [
      { key: "health", label: t("sys.health"), icon: Activity },
      { key: "logs", label: t("sys.logs"), icon: FileText },
      { key: "storage", label: t("sys.storage"), icon: HardDrive },
      { key: "cron", label: t("sys.cron"), icon: Clock },
      { key: "spam", label: t("sys.spam"), icon: ShieldAlert },
      { key: "seo", label: t("sys.seo"), icon: Search },
      { key: "io", label: t("sys.io"), icon: Download },
      { key: "email", label: t("sys.email"), icon: Mail },
      { key: "feedback", label: t("sys.feedback"), icon: Star },
    ];
  return (
    <div>
      <div className="mb-4 flex gap-2 overflow-x-auto -mx-4 px-4 no-scrollbar">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setSub(key)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${sub === key ? "border-primary bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>
      {sub === "health" && <HealthPanel />}
      {sub === "logs" && <LogsPanel />}
      {sub === "storage" && <StoragePanel />}
      {sub === "cron" && <CronPanel />}
      {sub === "spam" && <SpamPanel />}
      {sub === "seo" && <SeoPanel />}
      {sub === "io" && <IoPanel />}
      {sub === "email" && <EmailPanel />}
      {sub === "feedback" && <FeedbackPanel />}
    </div>
  );
}

function HealthPanel() {
  const t = useT();
  const q = useQuery({
    queryKey: ["sys-health"],
    queryFn: fetchSystemHealth,
    refetchInterval: 30_000,
  });
  const d = (q.data ?? {}) as Record<string, number | string>;
  const items: [string, keyof typeof d][] = [
    ["sys.h.users", "users"],
    ["sys.h.dbSize", "db_size_bytes"],
    ["sys.h.active24", "active_sessions_24h"],
    ["sys.h.errors24", "errors_24h"],
    ["sys.h.unread", "notifications_pending"],
    ["sys.h.supportOpen", "support_open"],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
      {items.map(([k, key]) => (
        <div key={k} className="rounded-xl border border-border/40 bg-surface/40 p-4">
          <div className="text-xs text-muted-foreground">{t(k)}</div>
          <div className="mt-1 text-2xl font-black">{String(d[key] ?? 0)}</div>
        </div>
      ))}
    </div>
  );
}

function LogsPanel() {
  const t = useT();
  const { lang } = usePreferences();
  const locale = lang === "en" ? "en-US" : "ar-EG";
  const q = useQuery({ queryKey: ["sys-logs"], queryFn: () => fetchSystemLogs(200) });
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((r) => {
        const l = r as {
          id: string;
          level: string;
          source: string | null;
          message: string;
          created_at: string;
        };
        return (
          <div key={l.id} className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${l.level === "error" ? "bg-destructive/20 text-destructive" : "bg-secondary text-muted-foreground"}`}
              >
                {l.level}
              </span>
              <span className="text-xs text-muted-foreground">
                {l.source} · {new Date(l.created_at).toLocaleString(locale)}
              </span>
            </div>
            <div className="mt-1 whitespace-pre-wrap break-all">{l.message}</div>
          </div>
        );
      })}
      {!q.isLoading && (q.data?.length ?? 0) === 0 && <Empty label={t("sys.empty")} />}
    </div>
  );
}

function StoragePanel() {
  const t = useT();
  const q = useQuery({ queryKey: ["sys-storage"], queryFn: fetchStorageStats });
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((b) => (
        <div
          key={b.bucket_id}
          className="flex items-center justify-between rounded-lg border border-border/40 bg-surface/40 p-3"
        >
          <div className="font-bold">{b.bucket_id}</div>
          <div className="text-xs text-muted-foreground">
            {b.files} {t("sys.files")} · {(b.total_bytes / 1024 / 1024).toFixed(2)} MB
          </div>
        </div>
      ))}
      {!q.isLoading && (q.data?.length ?? 0) === 0 && <Empty label={t("sys.empty")} />}
    </div>
  );
}

function CronPanel() {
  const qc = useQueryClient();
  const t = useT();
  const q = useQuery({ queryKey: ["sys-cron"], queryFn: fetchCronJobs });
  async function flip(id: string, on: boolean) {
    try {
      await toggleCron(id, on);
      qc.invalidateQueries({ queryKey: ["sys-cron"] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((c) => {
        const j = c as {
          id: string;
          code: string;
          name: string;
          schedule: string;
          is_enabled: boolean;
          description: string | null;
        };
        return (
          <div
            key={j.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3"
          >
            <div className="min-w-0">
              <div className="truncate font-bold">{j.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                <code>{j.schedule}</code> · {j.description}
              </div>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={j.is_enabled}
                onChange={(e) => flip(j.id, e.target.checked)}
              />
              {j.is_enabled ? t("common.enabled") : t("common.disabled")}
            </label>
          </div>
        );
      })}
    </div>
  );
}

function SpamPanel() {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sys-spam"], queryFn: fetchSpamWords });
  async function add() {
    const w = await promptDialog({ title: t("sys.spam.add") });
    if (!w) return;
    try {
      await addSpamWord(w);
      qc.invalidateQueries({ queryKey: ["sys-spam"] });
    } catch (e) {
      showError(e);
    }
  }
  async function del(id: string) {
    if (!(await confirmDialog({ title: t("common.confirmDelete"), danger: true }))) return;
    try {
      await removeSpamWord(id);
      qc.invalidateQueries({ queryKey: ["sys-spam"] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={add}>
          <Plus className="me-1 h-4 w-4" />
          {t("sys.spam.add")}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {(q.data ?? []).map((w) => (
          <div
            key={w.id}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-surface/40 px-3 py-1 text-xs"
          >
            <span>{w.word}</span>
            <button onClick={() => del(w.id)} aria-label="delete">
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SeoPanel() {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["sys-seo"], queryFn: fetchSeoOverrides });
  const [editing, setEditing] = useState<SeoOverride | { path: string } | null>(null);
  async function save(s: Partial<SeoOverride> & { path: string }) {
    try {
      await upsertSeo(s);
      toast.success(t("common.saved"));
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["sys-seo"] });
    } catch (e) {
      showError(e);
    }
  }
  async function del(id: string) {
    if (!(await confirmDialog({ title: t("common.confirmDelete"), danger: true }))) return;
    try {
      await deleteSeo(id);
      qc.invalidateQueries({ queryKey: ["sys-seo"] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button size="sm" onClick={() => setEditing({ path: "/" })}>
          <Plus className="me-1 h-4 w-4" />
          {t("sys.seo.add")}
        </Button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3"
          >
            <div className="min-w-0">
              <div className="truncate font-mono text-xs">{s.path}</div>
              <div className="truncate text-sm font-bold">{s.title_ar || s.title_en || "—"}</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                {t("common.edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => del(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {editing && <SeoForm initial={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function SeoForm({
  initial,
  onClose,
  onSave,
}: {
  initial: Partial<SeoOverride> & { path: string };
  onClose: () => void;
  onSave: (s: Partial<SeoOverride> & { path: string }) => void;
}) {
  const t = useT();
  const [f, setF] = useState<Partial<SeoOverride> & { path: string }>(initial);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-border/40 bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-3 text-lg font-black">{t("sys.seo.edit")}</h2>
        <div className="space-y-2">
          <Input
            label={t("sys.seo.path")}
            value={f.path}
            onChange={(v) => setF({ ...f, path: v })}
          />
          <Input
            label={t("sys.seo.titleAr")}
            value={f.title_ar ?? ""}
            onChange={(v) => setF({ ...f, title_ar: v })}
          />
          <Input
            label={t("sys.seo.titleEn")}
            value={f.title_en ?? ""}
            onChange={(v) => setF({ ...f, title_en: v })}
          />
          <Input
            label={t("sys.seo.descAr")}
            value={f.description_ar ?? ""}
            onChange={(v) => setF({ ...f, description_ar: v })}
            multiline
          />
          <Input
            label={t("sys.seo.descEn")}
            value={f.description_en ?? ""}
            onChange={(v) => setF({ ...f, description_en: v })}
            multiline
          />
          <Input
            label={t("sys.seo.ogImage")}
            value={f.og_image ?? ""}
            onChange={(v) => setF({ ...f, og_image: v })}
          />
          <Input
            label={t("sys.seo.robots")}
            value={f.robots ?? ""}
            onChange={(v) => setF({ ...f, robots: v })}
            placeholder="index,follow"
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => onSave(f)}>{t("common.save")}</Button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  multiline,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          placeholder={placeholder}
          className="mt-1 w-full rounded-md border border-input bg-background/60 p-2 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-1 h-9 w-full rounded-md border border-input bg-background/60 px-2 text-sm"
        />
      )}
    </label>
  );
}

function IoPanel() {
  const t = useT();
  const q = useQuery({ queryKey: ["io-jobs"], queryFn: fetchIoJobs });
  const entities = ["novels", "chapters", "profiles", "genres", "comments"] as const;
  async function exp(e: (typeof entities)[number]) {
    try {
      const json = await exportTable(e);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${e}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t("sys.io.exported"));
    } catch (err) {
      showError(err);
    }
  }
  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {entities.map((e) => (
          <Button key={e} size="sm" variant="outline" onClick={() => exp(e)}>
            <Download className="me-1 h-4 w-4" />
            {e}
          </Button>
        ))}
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map((j) => {
          const r = j as {
            id: string;
            kind: string;
            entity: string;
            rows: number;
            status: string;
            created_at: string;
          };
          return (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-lg border border-border/40 bg-surface/40 p-3 text-sm"
            >
              <span>
                {r.kind} · <b>{r.entity}</b> · {r.rows} {t("sys.io.rows")}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmailPanel() {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["email-templates"], queryFn: fetchEmailTemplates });
  const [editing, setEditing] = useState<Partial<
    import("@/lib/enterprise-api").EmailTemplate
  > | null>(null);
  async function save() {
    if (!editing?.code || !editing?.name || !editing?.subject_ar || !editing?.body_ar) {
      toast.error(t("common.required"));
      return;
    }
    try {
      await upsertEmailTemplate({
        code: editing.code,
        name: editing.name,
        subject_ar: editing.subject_ar,
        subject_en: editing.subject_en ?? null,
        body_ar: editing.body_ar,
        body_en: editing.body_en ?? null,
        is_active: editing.is_active ?? true,
      });
      toast.success(t("common.saved"));
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    } catch (e) {
      showError(e);
    }
  }
  async function del(id: string) {
    if (!(await confirmDialog({ title: t("common.confirmDelete"), danger: true }))) return;
    try {
      await deleteEmailTemplate(id);
      qc.invalidateQueries({ queryKey: ["email-templates"] });
    } catch (e) {
      showError(e);
    }
  }
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button
          size="sm"
          onClick={() =>
            setEditing({ code: "", name: "", subject_ar: "", body_ar: "", is_active: true })
          }
        >
          <Plus className="me-1 h-4 w-4" />
          {t("sys.email.new")}
        </Button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map((tpl) => (
          <div
            key={tpl.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-surface/40 p-3"
          >
            <div className="min-w-0">
              <div className="truncate font-bold">{tpl.name}</div>
              <div className="truncate font-mono text-xs text-muted-foreground">{tpl.code}</div>
            </div>
            <div className="flex shrink-0 gap-1.5">
              <Button size="sm" variant="outline" onClick={() => setEditing(tpl)}>
                {t("common.edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => del(tpl.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border/40 bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-lg font-black">{t("sys.email.edit")}</h2>
            <div className="space-y-2">
              <Input
                label={t("sys.email.code")}
                value={editing.code ?? ""}
                onChange={(v) => setEditing({ ...editing, code: v })}
              />
              <Input
                label={t("sys.email.name")}
                value={editing.name ?? ""}
                onChange={(v) => setEditing({ ...editing, name: v })}
              />
              <Input
                label={t("sys.email.subjectAr")}
                value={editing.subject_ar ?? ""}
                onChange={(v) => setEditing({ ...editing, subject_ar: v })}
              />
              <Input
                label={t("sys.email.subjectEn")}
                value={editing.subject_en ?? ""}
                onChange={(v) => setEditing({ ...editing, subject_en: v })}
              />
              <Input
                label={t("sys.email.bodyAr")}
                value={editing.body_ar ?? ""}
                onChange={(v) => setEditing({ ...editing, body_ar: v })}
                multiline
              />
              <Input
                label={t("sys.email.bodyEn")}
                value={editing.body_en ?? ""}
                onChange={(v) => setEditing({ ...editing, body_en: v })}
                multiline
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEditing(null)}>
                {t("common.cancel")}
              </Button>
              <Button onClick={save}>{t("common.save")}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FeedbackPanel() {
  const t = useT();
  const q = useQuery({ queryKey: ["fb-admin"], queryFn: fetchFeedback });
  return (
    <div className="space-y-2">
      {(q.data ?? []).map((f) => {
        const r = f as {
          id: string;
          rating: number;
          message: string | null;
          category: string;
          page_url: string | null;
          created_at: string;
        };
        return (
          <div key={r.id} className="rounded-lg border border-border/40 bg-surface/40 p-3 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-bold text-amber-400">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.category} · {new Date(r.created_at).toLocaleString()}
              </span>
            </div>
            {r.message && <div className="mt-1 whitespace-pre-wrap">{r.message}</div>}
            {r.page_url && (
              <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                {r.page_url}
              </div>
            )}
          </div>
        );
      })}
      {!q.isLoading && (q.data?.length ?? 0) === 0 && <Empty label={t("sys.empty")} />}
    </div>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}
