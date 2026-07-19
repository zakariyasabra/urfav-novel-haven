import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Sparkles, RefreshCw, BarChart3 } from "lucide-react";

import {
  mkListItems, mkListCategories, mkAdminUpsertItem, mkAdminDeleteItem, mkRotateDailyShop, mkEconomyDashboard,
  RARITY_STYLES, CATEGORY_LABELS_AR,
  type MarketItem, type MarketCategoryRow, type MarketCategory, type Rarity, type EconomyDashboard,
} from "@/lib/marketplace-api";
import { toArabicError } from "@/lib/errors";

export function MarketplaceTab() {
  const [tab, setTab] = useState<"items" | "economy">("items");
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button onClick={() => setTab("items")} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "items" ? "border-primary bg-primary text-primary-foreground" : "border-border/50"}`}>العناصر</button>
        <button onClick={() => setTab("economy")} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${tab === "economy" ? "border-primary bg-primary text-primary-foreground" : "border-border/50"}`}>لوحة الاقتصاد</button>
      </div>
      {tab === "items" ? <ItemsManager /> : <EconomyPanel />}
    </div>
  );
}

function ItemsManager() {
  const [cats, setCats] = useState<MarketCategoryRow[]>([]);
  const [items, setItems] = useState<MarketItem[]>([]);
  const [editing, setEditing] = useState<Partial<MarketItem> | null>(null);
  const [loading, setLoading] = useState(false);

  async function reload() {
    setLoading(true);
    const [c, its] = await Promise.all([mkListCategories(), mkListItems()]);
    setCats(c); setItems(its); setLoading(false);
  }
  useEffect(() => { void reload(); }, []);

  async function rotate() {
    try {
      const n = await mkRotateDailyShop(6);
      toast.success(`تم تدوير المتجر اليومي (${n} عنصر)`);
    } catch (e) { toast.error(toArabicError(e)); }
  }

  async function del(id: string) {
    if (!confirm("حذف هذا العنصر؟")) return;
    try { await mkAdminDeleteItem(id); toast.success("تم الحذف"); void reload(); }
    catch (e) { toast.error(toArabicError(e)); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={() => setEditing({ category: "frame", rarity: "common", price_coins: 100, is_active: true, payload: {} })}
          className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
          <Plus className="h-4 w-4" /> عنصر جديد
        </button>
        <button onClick={rotate} className="inline-flex items-center gap-1 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
          <RefreshCw className="h-4 w-4" /> تدوير المتجر اليومي
        </button>
        <span className="ms-auto text-xs text-muted-foreground">{items.length} عنصر</span>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          <thead className="bg-card/60 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-start">العنوان</th>
              <th className="p-2 text-start">الفئة</th>
              <th className="p-2 text-start">الندرة</th>
              <th className="p-2 text-start">السعر</th>
              <th className="p-2 text-start">المخزون</th>
              <th className="p-2 text-start">حالة</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">جاري التحميل…</td></tr>}
            {!loading && items.map((it) => (
              <tr key={it.id} className="border-t border-border/30">
                <td className="p-2 font-semibold">{it.title_ar}</td>
                <td className="p-2 text-xs text-muted-foreground">{CATEGORY_LABELS_AR[it.category]}</td>
                <td className={`p-2 text-xs ${RARITY_STYLES[it.rarity].text}`}>{RARITY_STYLES[it.rarity].label_ar}</td>
                <td className="p-2">{it.price_coins.toLocaleString()}</td>
                <td className="p-2 text-xs">{it.stock == null ? "∞" : `${it.stock - it.stock_sold}/${it.stock}`}</td>
                <td className="p-2 text-xs">{it.is_active ? "✓ نشط" : "⏸ متوقف"}</td>
                <td className="p-2">
                  <div className="flex gap-1">
                    <button onClick={() => setEditing(it)} className="rounded p-1 text-primary hover:bg-primary/10"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del(it.id)} className="rounded p-1 text-red-400 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && items.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد عناصر</td></tr>}
          </tbody>
        </table>
      </div>

      {editing && <ItemEditor cats={cats} item={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void reload(); }} />}
    </div>
  );
}

function ItemEditor({ item, cats, onClose, onSaved }: { item: Partial<MarketItem>; cats: MarketCategoryRow[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<MarketItem>>({ ...item });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof MarketItem>(k: K, v: MarketItem[K] | null) => setF((p) => ({ ...p, [k]: v as never }));

  async function save() {
    setSaving(true);
    try {
      if (!f.title_ar || !f.category || !f.code) { toast.error("العنوان والكود والفئة مطلوبة"); return; }
      await mkAdminUpsertItem(f);
      toast.success("تم الحفظ");
      onSaved();
    } catch (e) { toast.error(toArabicError(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border/40 bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black"><Sparkles className="h-5 w-5 text-primary" /> {item.id ? "تعديل عنصر" : "عنصر جديد"}</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Field label="العنوان (عربي)"><input value={f.title_ar ?? ""} onChange={(e) => set("title_ar", e.target.value)} className={inputCls} /></Field>
          <Field label="العنوان (إنجليزي)"><input value={f.title_en ?? ""} onChange={(e) => set("title_en", e.target.value)} className={inputCls} /></Field>
          <Field label="كود فريد"><input value={f.code ?? ""} onChange={(e) => set("code", e.target.value)} className={inputCls} placeholder="frame_gold" /></Field>
          <Field label="الفئة">
            <select value={f.category ?? ""} onChange={(e) => set("category", e.target.value as MarketCategory)} className={inputCls}>
              <option value="">—</option>
              {cats.map((c) => <option key={c.code} value={c.code}>{c.label_ar}</option>)}
            </select>
          </Field>
          <Field label="الندرة">
            <select value={f.rarity ?? "common"} onChange={(e) => set("rarity", e.target.value as Rarity)} className={inputCls}>
              <option value="common">عادي</option>
              <option value="rare">نادر</option>
              <option value="epic">ملحمي</option>
              <option value="legendary">أسطوري</option>
            </select>
          </Field>
          <Field label="السعر (عملات)"><input type="number" value={f.price_coins ?? 0} onChange={(e) => set("price_coins", +e.target.value)} className={inputCls} /></Field>
          <Field label="المدة (أيام، فارغ = دائم)"><input type="number" value={f.duration_days ?? ""} onChange={(e) => set("duration_days", e.target.value ? +e.target.value : null)} className={inputCls} /></Field>
          <Field label="المخزون (فارغ = غير محدود)"><input type="number" value={f.stock ?? ""} onChange={(e) => set("stock", e.target.value ? +e.target.value : null)} className={inputCls} /></Field>
          <Field label="حد لكل مستخدم"><input type="number" value={f.max_per_user ?? ""} onChange={(e) => set("max_per_user", e.target.value ? +e.target.value : null)} className={inputCls} /></Field>
          <Field label="أيقونة (emoji)"><input value={f.icon ?? ""} onChange={(e) => set("icon", e.target.value)} className={inputCls} /></Field>
          <Field label="رابط صورة"><input value={f.image_url ?? ""} onChange={(e) => set("image_url", e.target.value)} className={inputCls} /></Field>
          <Field label="يبدأ في"><input type="datetime-local" value={f.starts_at?.slice(0,16) ?? ""} onChange={(e) => set("starts_at", e.target.value || null)} className={inputCls} /></Field>
          <Field label="ينتهي في"><input type="datetime-local" value={f.ends_at?.slice(0,16) ?? ""} onChange={(e) => set("ends_at", e.target.value || null)} className={inputCls} /></Field>
          <div className="col-span-2">
            <Field label="الوصف (عربي)"><textarea value={f.description_ar ?? ""} onChange={(e) => set("description_ar", e.target.value)} className={inputCls + " min-h-[60px]"} /></Field>
          </div>
          <div className="col-span-2">
            <Field label="Payload JSON (frame_code / title_code / vip_days / lifetime …)">
              <textarea
                value={JSON.stringify(f.payload ?? {}, null, 2)}
                onChange={(e) => { try { set("payload", JSON.parse(e.target.value)); } catch { /* ignore */ } }}
                className={inputCls + " font-mono text-xs min-h-[80px]"}
              />
            </Field>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.is_active} onChange={(e) => set("is_active", e.target.checked)} /> نشط</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!f.vip_only} onChange={(e) => set("vip_only", e.target.checked)} /> VIP فقط</label>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-border/50 px-4 py-2 text-sm">إلغاء</button>
          <button disabled={saving} onClick={save} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">حفظ</button>
        </div>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-border/50 bg-background/60 px-3 py-1.5 text-sm";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold text-muted-foreground">{label}</span>{children}</label>;
}

function EconomyPanel() {
  const [data, setData] = useState<EconomyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { void mkEconomyDashboard(30).then((d) => { setData(d); setLoading(false); }); }, []);

  if (loading) return <div className="rounded-xl bg-card/40 p-10 text-center text-muted-foreground">جاري التحميل…</div>;
  if (!data) return <div className="rounded-xl bg-card/40 p-10 text-center text-muted-foreground">تعذّر التحميل</div>;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="عملات مولّدة" value={data.total_generated} tone="pos" />
        <Stat label="عملات مصروفة" value={data.total_spent} tone="neg" />
        <Stat label="متوسط رصيد المستخدم" value={data.avg_user_coins} tone="neutral" />
      </div>

      <Section title="أعلى المشترين" icon={<BarChart3 className="h-4 w-4" />}>
        <List rows={data.top_buyers.map((b) => ({ a: b.user_id.slice(0, 8), b: `${b.purchases} عملية`, c: b.spent.toLocaleString() + " عملة" }))} />
      </Section>
      <Section title="أعلى الكاسبين" icon={<BarChart3 className="h-4 w-4" />}>
        <List rows={data.top_earners.map((b) => ({ a: b.user_id.slice(0, 8), b: "", c: b.earned.toLocaleString() + " عملة" }))} />
      </Section>
      <Section title="الأكثر شراءً" icon={<BarChart3 className="h-4 w-4" />}>
        <List rows={data.most_purchased.map((m) => ({ a: m.title_ar || "—", b: `${m.purchases} عملية`, c: m.revenue.toLocaleString() + " عملة" }))} />
      </Section>
      <Section title="التدفق اليومي" icon={<BarChart3 className="h-4 w-4" />}>
        <div className="grid grid-cols-2 gap-2 text-xs md:grid-cols-4">
          {data.daily_flow.slice(-8).map((d) => (
            <div key={d.day} className="rounded-lg border border-border/40 bg-background/40 p-2">
              <div className="mb-1 text-[10px] text-muted-foreground">{new Date(d.day).toLocaleDateString("ar-EG")}</div>
              <div className="text-emerald-400">+{d.earned}</div>
              <div className="text-red-400">-{d.spent}</div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "pos" | "neg" | "neutral" }) {
  const c = tone === "pos" ? "text-emerald-300" : tone === "neg" ? "text-red-300" : "text-primary";
  return (
    <div className="rounded-xl border border-border/40 bg-card/60 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 text-2xl font-black ${c}`}>{value.toLocaleString()}</div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/50 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold">{icon}{title}</h3>
      {children}
    </div>
  );
}

function List({ rows }: { rows: Array<{ a: string; b: string; c: string }> }) {
  if (rows.length === 0) return <div className="text-xs text-muted-foreground">لا توجد بيانات</div>;
  return (
    <ul className="divide-y divide-border/30">
      {rows.map((r, i) => (
        <li key={i} className="flex items-center justify-between py-2 text-xs">
          <span className="font-mono text-muted-foreground">{r.a}</span>
          <span className="text-muted-foreground">{r.b}</span>
          <span className="font-bold text-primary">{r.c}</span>
        </li>
      ))}
    </ul>
  );
}
