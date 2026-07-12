import { showError } from "@/lib/errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchHomepageSections, upsertHomepageSection, deleteHomepageSection, type HomepageSection } from "@/lib/monetization-api";

const ALGOS = [
  { v: "latest", l: "الأحدث تحديثاً" },
  { v: "popular", l: "الأكثر مشاهدة" },
  { v: "top_rated", l: "الأعلى تقييماً" },
  { v: "completed", l: "المكتملة" },
  { v: "ongoing", l: "المستمرة" },
  { v: "trending", l: "الرائجة" },
  { v: "upcoming", l: "قادم قريباً" },
  { v: "random", l: "عشوائي" },
  { v: "genre", l: "حسب التصنيف" },
];

export function HomepageBuilderTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["homepage-sections-admin"], queryFn: () => fetchHomepageSections(true) });
  const [editing, setEditing] = useState<HomepageSection | "new" | null>(null);

  async function toggle(row: HomepageSection) {
    await upsertHomepageSection({ ...row, enabled: !row.enabled });
    qc.invalidateQueries({ queryKey: ["homepage-sections-admin"] });
  }
  async function move(row: HomepageSection, dir: -1 | 1) {
    const sorted = [...(q.data ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const i = sorted.findIndex((r) => r.id === row.id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const other = sorted[j];
    await Promise.all([
      upsertHomepageSection({ ...row, sort_order: other.sort_order }),
      upsertHomepageSection({ ...other, sort_order: row.sort_order }),
    ]);
    qc.invalidateQueries({ queryKey: ["homepage-sections-admin"] });
  }
  async function del(id: string) {
    if (!confirm("حذف هذا القسم؟")) return;
    await deleteHomepageSection(id);
    toast.success("تم الحذف");
    qc.invalidateQueries({ queryKey: ["homepage-sections-admin"] });
  }

  const list = [...(q.data ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="text-sm text-muted-foreground">أقسام الصفحة الرئيسية — رتبها كما تريد.</div>
        <Button size="sm" onClick={() => setEditing("new")}><Plus className="me-1 h-4 w-4" />قسم جديد</Button>
      </div>
      <div className="space-y-2">
        {list.map((s) => (
          <div key={s.id} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3">
            <div className="flex flex-col gap-1">
              <button onClick={() => move(s, -1)} className="grid h-6 w-6 place-items-center rounded hover:bg-secondary"><ArrowUp className="h-3 w-3" /></button>
              <button onClick={() => move(s, 1)} className="grid h-6 w-6 place-items-center rounded hover:bg-secondary"><ArrowDown className="h-3 w-3" /></button>
            </div>
            <div className="min-w-0">
              <div className="truncate font-bold">{s.title}</div>
              <div className="truncate text-xs text-muted-foreground">
                {ALGOS.find((a) => a.v === s.algorithm)?.l ?? s.algorithm} · {s.limit_count} عناصر
                {s.genre_slug && ` · ${s.genre_slug}`}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(s)}>
                {s.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(s)}>تعديل</Button>
              <Button size="sm" variant="outline" onClick={() => del(s.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {list.length === 0 && <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">لا أقسام. أضف قسماً لتخصيص الصفحة الرئيسية.</div>}
      </div>
      {editing && <SectionForm initial={editing === "new" ? null : editing} onClose={() => { setEditing(null); qc.invalidateQueries({ queryKey: ["homepage-sections-admin"] }); }} nextOrder={(list[list.length - 1]?.sort_order ?? 0) + 10} />}
    </div>
  );
}

function SectionForm({ initial, onClose, nextOrder }: { initial: HomepageSection | null; onClose: () => void; nextOrder: number }) {
  const [f, setF] = useState({
    id: initial?.id,
    title: initial?.title ?? "",
    subtitle: initial?.subtitle ?? "",
    icon: initial?.icon ?? "",
    algorithm: initial?.algorithm ?? "latest",
    genre_slug: initial?.genre_slug ?? "",
    limit_count: initial?.limit_count ?? 12,
    sort_order: initial?.sort_order ?? nextOrder,
    enabled: initial?.enabled ?? true,
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    if (!f.title.trim()) { toast.error("العنوان مطلوب"); return; }
    setBusy(true);
    try {
      await upsertHomepageSection({
        ...f,
        subtitle: f.subtitle || null,
        icon: f.icon || null,
        genre_slug: f.algorithm === "genre" ? f.genre_slug : null,
      });
      toast.success("تم الحفظ"); onClose();
    } catch (e: unknown) { showError(e); }
    setBusy(false);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border/60 bg-surface p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-4 text-xl font-black">{initial ? "تعديل قسم" : "قسم جديد"}</h3>
        <div className="grid gap-3">
          <Field label="العنوان" v={f.title} on={(v) => setF({ ...f, title: v })} />
          <Field label="عنوان فرعي" v={f.subtitle} on={(v) => setF({ ...f, subtitle: v })} />
          <Field label="أيقونة (اسم من lucide، اختياري)" v={f.icon} on={(v) => setF({ ...f, icon: v })} />
          <div>
            <label className="mb-1 block text-xs font-semibold">الخوارزمية</label>
            <select value={f.algorithm} onChange={(e) => setF({ ...f, algorithm: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm">
              {ALGOS.map((a) => <option key={a.v} value={a.v}>{a.l}</option>)}
            </select>
          </div>
          {f.algorithm === "genre" && <Field label="معرّف التصنيف (slug)" v={f.genre_slug} on={(v) => setF({ ...f, genre_slug: v })} />}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold">عدد العناصر</label>
              <input type="number" min={1} max={50} value={f.limit_count}
                onChange={(e) => setF({ ...f, limit_count: parseInt(e.target.value) || 12 })}
                className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">الترتيب</label>
              <input type="number" value={f.sort_order}
                onChange={(e) => setF({ ...f, sort_order: parseInt(e.target.value) || 0 })}
                className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
            </div>
          </div>
          <label className="flex items-center gap-2">
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
function Field({ label, v, on }: { label: string; v: string; on: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">{label}</label>
      <input value={v} onChange={(e) => on(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm" />
    </div>
  );
}
