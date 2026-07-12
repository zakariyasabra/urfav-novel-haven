import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Crown, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchAllVipPlans, upsertVipPlan, deleteVipPlan, type VipPlanAdmin } from "@/lib/pricing-api";
import { showError } from "@/lib/errors";
import { confirmDialog } from "@/components/ui/dialog-service";

const AVAILABLE_FEATURES: { key: string; label: string }[] = [
  { key: "ad_free", label: "بدون إعلانات" },
  { key: "early_access", label: "فصول مبكرة" },
  { key: "vip_badge", label: "شارة VIP" },
  { key: "discount", label: "خصم على الاشتراكات" },
  { key: "exclusive_content", label: "محتوى حصري" },
  { key: "priority_support", label: "دعم أولوي" },
];

type Draft = Partial<VipPlanAdmin> & { code: string; name_ar: string; duration_days: number };
const EMPTY: Draft = {
  code: "", name_ar: "", name_en: "", description_ar: "",
  price_cents: 0, price_usd_cents: 999, price_egp_cents: 50000, currency: "USD",
  duration_days: 30, features: ["ad_free"], is_active: true, is_recommended: false, discount_percent: 0, sort_order: 0,
};

export function VipPlansTab() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-vip-plans"], queryFn: fetchAllVipPlans });
  const [draft, setDraft] = useState<Draft | null>(null);

  async function save() {
    if (!draft) return;
    if (!draft.code.trim()) return toast.error("أدخل رمز الخطة");
    if (!draft.name_ar.trim()) return toast.error("أدخل اسم الخطة");
    if (!draft.duration_days || draft.duration_days <= 0) return toast.error("أدخل مدة صحيحة");
    try {
      await upsertVipPlan({
        ...draft,
        code: draft.code.trim(),
        name_ar: draft.name_ar.trim(),
        duration_days: Number(draft.duration_days),
        price_cents: Number(draft.price_usd_cents ?? draft.price_cents ?? 0),
        price_usd_cents: draft.price_usd_cents != null ? Number(draft.price_usd_cents) : null,
        price_egp_cents: draft.price_egp_cents != null ? Number(draft.price_egp_cents) : null,
        discount_percent: Number(draft.discount_percent ?? 0),
        sort_order: Number(draft.sort_order ?? 0),
      });
      toast.success("تم الحفظ");
      qc.invalidateQueries({ queryKey: ["admin-vip-plans"] });
      qc.invalidateQueries({ queryKey: ["vip-plans"] });
      setDraft(null);
    } catch (e) { showError(e); }
  }

  async function remove(id: string) {
    if (!(await confirmDialog({ title: "حذف الخطة؟", body: "لن يمكن التراجع.", danger: true }))) return;
    try { await deleteVipPlan(id); toast.success("تم الحذف"); qc.invalidateQueries({ queryKey: ["admin-vip-plans"] }); qc.invalidateQueries({ queryKey: ["vip-plans"] }); }
    catch (e) { showError(e); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">خطط VIP</h3>
        <Button size="sm" onClick={() => setDraft({ ...EMPTY })}><Plus className="me-1 h-4 w-4" />خطة جديدة</Button>
      </div>

      {draft && <PlanForm draft={draft} setDraft={setDraft} onSave={save} onCancel={() => setDraft(null)} />}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map((p) => (
          <div key={p.id} className={`rounded-xl border p-4 ${p.is_active ? "border-border/40 bg-surface/40" : "border-dashed border-border/40 bg-surface/20 opacity-70"}`}>
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                <span className="font-black">{p.name_ar}</span>
                {p.is_recommended && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{p.code}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {p.duration_days} يوم · {p.price_usd_cents != null && <>${((p.price_usd_cents) / 100).toFixed(2)}</>}
              {p.price_usd_cents != null && p.price_egp_cents != null && " · "}
              {p.price_egp_cents != null && <>{(p.price_egp_cents / 100).toFixed(2)} ج.م</>}
            </div>
            {p.discount_percent > 0 && <div className="mt-1 inline-block rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">خصم {p.discount_percent}%</div>}
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setDraft(p)}>تعديل</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
        {q.data?.length === 0 && !draft && (
          <div className="col-span-full rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">لا توجد خطط.</div>
        )}
      </div>
    </div>
  );
}

function PlanForm({ draft, setDraft, onSave, onCancel }: { draft: Draft; setDraft: (d: Draft) => void; onSave: () => void; onCancel: () => void }) {
  const upd = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  const features = draft.features ?? [];
  function toggleFeature(k: string) {
    const set = new Set(features);
    if (set.has(k)) set.delete(k); else set.add(k);
    upd("features", Array.from(set));
  }
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <F label="رمز الخطة (code)" value={draft.code} onChange={(v) => upd("code", v)} placeholder="monthly" />
        <F label="الاسم بالعربية" value={draft.name_ar} onChange={(v) => upd("name_ar", v)} />
        <F label="الاسم بالإنجليزية" value={draft.name_en ?? ""} onChange={(v) => upd("name_en", v)} />
        <F label="الوصف" value={draft.description_ar ?? ""} onChange={(v) => upd("description_ar", v)} />
        <N label="المدة (أيام)" value={draft.duration_days} onChange={(v) => upd("duration_days", v)} />
        <N label="ترتيب العرض" value={draft.sort_order ?? 0} onChange={(v) => upd("sort_order", v)} />
        <N label="السعر بالدولار (سنت)" value={draft.price_usd_cents ?? 0} onChange={(v) => upd("price_usd_cents", v)} hint="999 = $9.99" />
        <N label="السعر بالجنيه (قرش)" value={draft.price_egp_cents ?? 0} onChange={(v) => upd("price_egp_cents", v)} hint="50000 = 500 ج.م" />
        <N label="نسبة الخصم %" value={draft.discount_percent ?? 0} onChange={(v) => upd("discount_percent", v)} />
      </div>

      <div className="mt-3">
        <div className="mb-1 text-xs font-bold">المزايا</div>
        <div className="flex flex-wrap gap-2">
          {AVAILABLE_FEATURES.map((f) => (
            <button key={f.key} type="button" onClick={() => toggleFeature(f.key)}
              className={`rounded-md px-3 py-1 text-xs font-semibold ${features.includes(f.key) ? "bg-primary text-primary-foreground" : "bg-surface/60 text-muted-foreground"}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <T label="الأفضل قيمة" value={!!draft.is_recommended} onChange={(v) => upd("is_recommended", v)} />
        <T label="مفعّلة" value={draft.is_active !== false} onChange={(v) => upd("is_active", v)} />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        <Button onClick={onSave}><Save className="me-1 h-4 w-4" />حفظ</Button>
      </div>
    </div>
  );
}

function F({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function N({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} dir="ltr"
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

function T({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
      <button type="button" onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? "start-0.5" : "end-0.5"}`} />
      </button>
      {label}
    </label>
  );
}
