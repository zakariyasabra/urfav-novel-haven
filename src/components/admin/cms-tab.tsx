import { showError } from "@/lib/errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FileText, HelpCircle, Megaphone, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
import { confirmDialog, promptDialog } from "@/components/ui/dialog-service";
  fetchAllPages, upsertStaticPage, deleteStaticPage, type StaticPage,
  fetchFaqs, upsertFaq, deleteFaq, type Faq,
  fetchAllAnnouncements, upsertAnnouncement, deleteAnnouncement, type Announcement,
} from "@/lib/monetization-api";

export function CmsTab() {
  const [sub, setSub] = useState<"pages" | "faqs" | "announcements">("pages");
  return (
    <div>
      <div className="mb-4 flex gap-1 rounded-lg border border-border/60 bg-surface/40 p-1">
        {[
          { k: "pages", l: "الصفحات الثابتة", i: FileText },
          { k: "faqs", l: "الأسئلة الشائعة", i: HelpCircle },
          { k: "announcements", l: "الإعلانات والبانرات", i: Megaphone },
        ].map(({ k, l, i: I }) => (
          <button key={k} onClick={() => setSub(k as typeof sub)}
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-xs font-semibold ${sub === k ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
            <I className="h-3.5 w-3.5" />{l}
          </button>
        ))}
      </div>
      {sub === "pages" && <PagesPanel />}
      {sub === "faqs" && <FaqsPanel />}
      {sub === "announcements" && <AnnouncementsPanel />}
    </div>
  );
}

// -------- Pages --------
function PagesPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cms-pages"], queryFn: fetchAllPages });
  const [editing, setEditing] = useState<StaticPage | "new" | null>(null);
  async function del(id: string) {
    if (!(await confirmDialog({ title: "تأكيد", body: "حذف هذه الصفحة؟", confirmLabel: "تأكيد", danger: true }))) return;
    await deleteStaticPage(id); toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["cms-pages"] });
  }
  return (
    <div>
      <div className="mb-3 flex justify-end"><Button size="sm" onClick={() => setEditing("new")}><Plus className="me-1 h-4 w-4" />صفحة</Button></div>
      <div className="space-y-2">
        {(q.data ?? []).map((p) => (
          <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3">
            <div className="min-w-0">
              <div className="truncate font-bold">{p.title}</div>
              <div className="text-xs text-muted-foreground">/{p.slug} {!p.is_published && "· مسودة"}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(p)}>تعديل</Button>
              <Button size="sm" variant="outline" onClick={() => del(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      {editing && <PageForm initial={editing === "new" ? null : editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["cms-pages"] }); }} />}
    </div>
  );
}
function PageForm({ initial, onClose }: { initial: StaticPage | null; onClose: () => void }) {
  const [f, setF] = useState({
    id: initial?.id,
    slug: initial?.slug ?? "",
    title: initial?.title ?? "",
    body_html: initial?.body_html ?? "",
    is_published: initial?.is_published ?? true,
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.slug.trim() || !f.title.trim()) { toast.error("العنوان والمعرّف مطلوبان"); return; }
    setBusy(true);
    try { await upsertStaticPage(f); toast.success("تم الحفظ"); onClose(); }
    catch (e: unknown) { showError(e); }
    setBusy(false);
  }
  return (
    <Modal onClose={onClose} title={initial ? "تعديل صفحة" : "صفحة جديدة"}>
      <Field label="المعرّف (slug) — /pages/xxx" v={f.slug} on={(v) => setF({ ...f, slug: v })} />
      <Field label="العنوان" v={f.title} on={(v) => setF({ ...f, title: v })} />
      <div>
        <label className="mb-1 block text-xs font-semibold">المحتوى (HTML)</label>
        <textarea value={f.body_html} onChange={(e) => setF({ ...f, body_html: e.target.value })}
          rows={10} className="w-full resize-none rounded-md border border-input bg-background/60 p-2 font-mono text-xs" />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={f.is_published} onChange={(e) => setF({ ...f, is_published: e.target.checked })} />
        <span className="text-sm">منشورة</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button disabled={busy} onClick={save}>حفظ</Button>
      </div>
    </Modal>
  );
}

// -------- FAQs --------
function FaqsPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cms-faqs"], queryFn: () => fetchFaqs(true) });
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  async function del(id: string) { if (!(await confirmDialog({ title: "تأكيد", body: "حذف؟", confirmLabel: "تأكيد", danger: true }))) return; await deleteFaq(id); qc.invalidateQueries({ queryKey: ["cms-faqs"] }); }
  return (
    <div>
      <div className="mb-3 flex justify-end"><Button size="sm" onClick={() => setEditing("new")}><Plus className="me-1 h-4 w-4" />سؤال</Button></div>
      <div className="space-y-2">
        {(q.data ?? []).map((f) => (
          <div key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3">
            <div className="min-w-0">
              <div className="truncate font-bold">{f.question}</div>
              <div className="truncate text-xs text-muted-foreground">{f.answer.slice(0, 120)}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(f)}>تعديل</Button>
              <Button size="sm" variant="outline" onClick={() => del(f.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      {editing && <FaqForm initial={editing === "new" ? null : editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["cms-faqs"] }); }} />}
    </div>
  );
}
function FaqForm({ initial, onClose }: { initial: Faq | null; onClose: () => void }) {
  const [f, setF] = useState({
    id: initial?.id, question: initial?.question ?? "", answer: initial?.answer ?? "",
    sort_order: initial?.sort_order ?? 0, enabled: initial?.enabled ?? true,
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.question.trim() || !f.answer.trim()) { toast.error("مطلوب"); return; }
    setBusy(true); try { await upsertFaq(f); onClose(); } catch (e) { showError(e); } setBusy(false);
  }
  return (
    <Modal onClose={onClose} title={initial ? "تعديل سؤال" : "سؤال جديد"}>
      <Field label="السؤال" v={f.question} on={(v) => setF({ ...f, question: v })} />
      <div>
        <label className="mb-1 block text-xs font-semibold">الإجابة</label>
        <textarea value={f.answer} onChange={(e) => setF({ ...f, answer: e.target.value })} rows={5}
          className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm" />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold">الترتيب</label>
        <input type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: parseInt(e.target.value) || 0 })}
          className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
        <span className="text-sm">مفعّل</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button disabled={busy} onClick={save}>حفظ</Button>
      </div>
    </Modal>
  );
}

// -------- Announcements --------
function AnnouncementsPanel() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["cms-anns"], queryFn: fetchAllAnnouncements });
  const [editing, setEditing] = useState<Announcement | "new" | null>(null);
  async function toggle(a: Announcement) { await upsertAnnouncement({ ...a, enabled: !a.enabled }); qc.invalidateQueries({ queryKey: ["cms-anns"] }); }
  async function del(id: string) { if (!(await confirmDialog({ title: "تأكيد", body: "حذف؟", confirmLabel: "تأكيد", danger: true }))) return; await deleteAnnouncement(id); qc.invalidateQueries({ queryKey: ["cms-anns"] }); }
  return (
    <div>
      <div className="mb-3 flex justify-end"><Button size="sm" onClick={() => setEditing("new")}><Plus className="me-1 h-4 w-4" />إعلان</Button></div>
      <div className="space-y-2">
        {(q.data ?? []).map((a) => (
          <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3">
            <div className="min-w-0">
              <div className="truncate font-bold">{a.title}</div>
              <div className="text-xs text-muted-foreground">{a.kind} {a.body && `· ${a.body.slice(0, 60)}`}</div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(a)}>{a.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(a)}>تعديل</Button>
              <Button size="sm" variant="outline" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
      {editing && <AnnForm initial={editing === "new" ? null : editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["cms-anns"] }); }} />}
    </div>
  );
}
function AnnForm({ initial, onClose }: { initial: Announcement | null; onClose: () => void }) {
  const [f, setF] = useState({
    id: initial?.id,
    kind: initial?.kind ?? "banner",
    title: initial?.title ?? "",
    body: initial?.body ?? "",
    link_url: initial?.link_url ?? "",
    starts_at: initial?.starts_at ?? "",
    ends_at: initial?.ends_at ?? "",
    enabled: initial?.enabled ?? true,
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.title.trim()) { toast.error("العنوان مطلوب"); return; }
    setBusy(true);
    try {
      await upsertAnnouncement({
        ...f,
        body: f.body || null, link_url: f.link_url || null,
        starts_at: f.starts_at || null, ends_at: f.ends_at || null,
      });
      onClose();
    } catch (e) { showError(e); }
    setBusy(false);
  }
  return (
    <Modal onClose={onClose} title={initial ? "تعديل إعلان" : "إعلان جديد"}>
      <div>
        <label className="mb-1 block text-xs font-semibold">النوع</label>
        <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}
          className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
          <option value="banner">شريط علوي</option>
          <option value="popup">نافذة منبثقة</option>
          <option value="homepage">إعلان الرئيسية</option>
        </select>
      </div>
      <Field label="العنوان" v={f.title} on={(v) => setF({ ...f, title: v })} />
      <div>
        <label className="mb-1 block text-xs font-semibold">النص</label>
        <textarea value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} rows={3}
          className="w-full resize-none rounded-md border border-input bg-background/60 p-2 text-sm" />
      </div>
      <Field label="رابط (اختياري)" v={f.link_url} on={(v) => setF({ ...f, link_url: v })} />
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="mb-1 block text-xs font-semibold">يبدأ</label>
          <input type="datetime-local" value={f.starts_at ? new Date(f.starts_at).toISOString().slice(0, 16) : ""}
            onChange={(e) => setF({ ...f, starts_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
            className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold">ينتهي</label>
          <input type="datetime-local" value={f.ends_at ? new Date(f.ends_at).toISOString().slice(0, 16) : ""}
            onChange={(e) => setF({ ...f, ends_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
            className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
        </div>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
        <span className="text-sm">مفعّل</span>
      </label>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
        <Button disabled={busy} onClick={save}>حفظ</Button>
      </div>
    </Modal>
  );
}

// -------- shared --------
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-black">{title}</h3>
        <div className="grid gap-3">{children}</div>
      </div>
    </div>
  );
}
function Field({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">{label}</label>
      <input value={v} onChange={(e) => on(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
    </div>
  );
}
