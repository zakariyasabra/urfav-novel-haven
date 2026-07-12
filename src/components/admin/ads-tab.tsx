import { showError } from "@/lib/errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchAllAds, upsertAd, deleteAd, type AdRow } from "@/lib/monetization-api";
import { confirmDialog, promptDialog } from "@/components/ui/dialog-service";

const SLOTS = [
  { v: "home_top", l: "الرئيسية — أعلى" },
  { v: "home_middle", l: "الرئيسية — منتصف" },
  { v: "home_bottom", l: "الرئيسية — أسفل" },
  { v: "sidebar", l: "الشريط الجانبي" },
  { v: "reader_top", l: "القارئ — أعلى" },
  { v: "reader_middle", l: "القارئ — بين الفقرات" },
  { v: "reader_bottom", l: "القارئ — أسفل" },
  { v: "footer", l: "التذييل" },
  { v: "banner", l: "بانر عام" },
];
const KINDS = [
  { v: "adsense", l: "Google AdSense" },
  { v: "html", l: "HTML مخصص" },
  { v: "image", l: "صورة (Image Ad)" },
  { v: "native", l: "Native Ad" },
];

export function AdsTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ads-admin"], queryFn: fetchAllAds });
  const [editing, setEditing] = useState<AdRow | "new" | null>(null);

  async function toggle(a: AdRow) {
    await upsertAd({ ...a, enabled: !a.enabled });
    qc.invalidateQueries({ queryKey: ["ads-admin"] });
  }
  async function del(id: string) {
    if (!(await confirmDialog({ title: "تأكيد", body: "حذف هذا الإعلان؟", confirmLabel: "تأكيد", danger: true }))) return;
    await deleteAd(id); toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["ads-admin"] });
  }

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="text-sm text-muted-foreground">إدارة الإعلانات • VIP لا يرى إعلانات.</div>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="me-1 h-4 w-4" />إعلان جديد</Button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map((a) => (
          <div key={a.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3">
            <div className="min-w-0">
              <div className="truncate font-bold">
                {SLOTS.find((s) => s.v === a.slot)?.l ?? a.slot}
                <span className="ms-2 rounded bg-secondary px-1.5 py-0.5 text-[10px]">{KINDS.find((k) => k.v === a.kind)?.l ?? a.kind}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                priority: {a.priority} · freq: {a.frequency}%
                {a.starts_at && ` · يبدأ ${new Date(a.starts_at).toLocaleDateString("ar")}`}
                {a.ends_at && ` · ينتهي ${new Date(a.ends_at).toLocaleDateString("ar")}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(a)}>{a.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(a)}>تعديل</Button>
              <Button size="sm" variant="outline" onClick={() => del(a.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">لا إعلانات.</div>}
      </div>
      {editing && <AdForm initial={editing === "new" ? null : editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["ads-admin"] }); }} />}
    </div>
  );
}

function AdForm({ initial, onClose }: { initial: AdRow | null; onClose: () => void }) {
  const [f, setF] = useState({
    id: initial?.id,
    slot: initial?.slot ?? "home_top",
    kind: initial?.kind ?? "html",
    enabled: initial?.enabled ?? true,
    script_html: initial?.script_html ?? "",
    image_url: initial?.image_url ?? "",
    link_url: initial?.link_url ?? "",
    starts_at: initial?.starts_at ?? "",
    ends_at: initial?.ends_at ?? "",
    priority: initial?.priority ?? 0,
    frequency: initial?.frequency ?? 100,
    label_ar: (initial as unknown as { label_ar?: string })?.label_ar ?? "إعلان",
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await upsertAd({
        ...f,
        script_html: f.script_html || null,
        image_url: f.image_url || null,
        link_url: f.link_url || null,
        starts_at: f.starts_at || null,
        ends_at: f.ends_at || null,
      });
      toast.success("تم الحفظ"); onClose();
    } catch (e: unknown) { showError(e); }
    setBusy(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-black">{initial ? "تعديل إعلان" : "إعلان جديد"}</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold">المكان</label>
            <select value={f.slot} onChange={(e) => setF({ ...f, slot: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
              {SLOTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">النوع</label>
            <select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
              {KINDS.map((k) => <option key={k.v} value={k.v}>{k.l}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">HTML / Script (لـ AdSense أو HTML)</label>
            <textarea value={f.script_html} onChange={(e) => setF({ ...f, script_html: e.target.value })}
              rows={5} className="w-full resize-none rounded-md border border-input bg-background/60 p-2 font-mono text-xs" />
          </div>
          {(f.kind === "image" || f.kind === "native") && (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold">رابط الصورة</label>
                <input value={f.image_url} onChange={(e) => setF({ ...f, image_url: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold">الرابط عند الضغط</label>
                <input value={f.link_url} onChange={(e) => setF({ ...f, link_url: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold">يبدأ في</label>
            <input type="datetime-local" value={f.starts_at ? new Date(f.starts_at).toISOString().slice(0, 16) : ""}
              onChange={(e) => setF({ ...f, starts_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">ينتهي في</label>
            <input type="datetime-local" value={f.ends_at ? new Date(f.ends_at).toISOString().slice(0, 16) : ""}
              onChange={(e) => setF({ ...f, ends_at: e.target.value ? new Date(e.target.value).toISOString() : "" })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">الأولوية</label>
            <input type="number" value={f.priority} onChange={(e) => setF({ ...f, priority: parseInt(e.target.value) || 0 })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">التكرار (%)</label>
            <input type="number" min={1} max={100} value={f.frequency}
              onChange={(e) => setF({ ...f, frequency: parseInt(e.target.value) || 100 })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} />
            <span className="text-sm">مفعّل</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>إلغاء</Button>
          <Button disabled={busy} onClick={save}>حفظ</Button>
        </div>
      </div>
    </div>
  );
}
