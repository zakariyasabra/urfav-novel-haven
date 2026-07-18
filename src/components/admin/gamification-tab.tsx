import { useEffect, useState } from "react";
import { Award, Save, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface XpRule { code: string; xp: number; coins: number; daily_cap: number; enabled: boolean }
interface Achievement {
  code: string; title_ar: string; title_en?: string | null;
  description_ar: string | null; description_en?: string | null;
  icon: string | null; xp: number; coins: number;
  threshold_kind: string; threshold_value: number;
  badge_code: string | null; sort_order: number; enabled: boolean;
}
interface Badge {
  code: string; title_ar: string; title_en?: string | null;
  description: string | null; icon: string | null;
  rarity: string; sort_order: number; enabled: boolean;
}

export function GamificationTab() {
  const [tab, setTab] = useState<"rules" | "achievements" | "badges">("rules");
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">نظام التحفيز (XP • عملات • إنجازات)</h2>
      </div>
      <div className="mb-4 flex gap-2 border-b border-border/40">
        {(["rules", "achievements", "badges"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold transition ${tab === k ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
          >
            {k === "rules" ? "قواعد XP" : k === "achievements" ? "الإنجازات" : "الشارات"}
          </button>
        ))}
      </div>
      {tab === "rules" && <RulesEditor />}
      {tab === "achievements" && <AchievementsEditor />}
      {tab === "badges" && <BadgesEditor />}
    </div>
  );
}

function RulesEditor() {
  const [rows, setRows] = useState<XpRule[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("xp_rules").select("code,xp,coins,daily_cap,enabled").order("code");
    setRows((data ?? []) as XpRule[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  function edit(i: number, patch: Partial<XpRule>) { setRows((v) => v.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  async function save(r: XpRule) {
    const { error } = await supabase.from("xp_rules").upsert(r);
    if (error) toast.error(error.message); else toast.success("تم الحفظ");
  }
  if (loading) return <div className="py-8 text-center text-muted-foreground">جاري التحميل…</div>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.code} className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-card/60 p-3 md:grid-cols-[1fr,80px,80px,100px,80px,auto]">
          <div className="col-span-2 md:col-span-1"><div className="font-bold text-sm">{r.code}</div></div>
          <input type="number" value={r.xp} onChange={(e) => edit(i, { xp: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" placeholder="XP" />
          <input type="number" value={r.coins} onChange={(e) => edit(i, { coins: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" placeholder="عملات" />
          <input type="number" value={r.daily_cap} onChange={(e) => edit(i, { daily_cap: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" placeholder="حد يومي" />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={r.enabled} onChange={(e) => edit(i, { enabled: e.target.checked })} />فعّال</label>
          <Button size="sm" onClick={() => save(r)}><Save className="h-3 w-3" /></Button>
        </div>
      ))}
      {rows.length === 0 ? <div className="rounded-lg border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">لا توجد قواعد بعد.</div> : null}
    </div>
  );
}

function AchievementsEditor() {
  const [rows, setRows] = useState<Achievement[]>([]);
  async function load() {
    const { data } = await supabase.from("achievements").select("*").order("sort_order");
    setRows((data ?? []) as Achievement[]);
  }
  useEffect(() => { void load(); }, []);
  function edit(i: number, patch: Partial<Achievement>) { setRows((v) => v.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  async function save(r: Achievement) {
    const { error } = await supabase.from("achievements").upsert(r);
    if (error) toast.error(error.message); else { toast.success("تم الحفظ"); void load(); }
  }
  async function del(code: string) {
    if (!confirm("حذف الإنجاز؟")) return;
    const { error } = await supabase.from("achievements").delete().eq("code", code);
    if (error) toast.error(error.message); else void load();
  }
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={() => setRows((v) => [...v, { code: "", title_ar: "", description_ar: "", icon: "🏆", xp: 0, coins: 0, threshold_kind: "chapters_read", threshold_value: 10, badge_code: null, sort_order: v.length, enabled: true }])}>
        <Plus className="h-4 w-4" /> إضافة إنجاز
      </Button>
      {rows.map((r, i) => (
        <div key={r.code || i} className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input placeholder="code" value={r.code} onChange={(e) => edit(i, { code: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input placeholder="أيقونة" value={r.icon ?? ""} onChange={(e) => edit(i, { icon: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input type="number" placeholder="XP" value={r.xp} onChange={(e) => edit(i, { xp: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input type="number" placeholder="عملات" value={r.coins} onChange={(e) => edit(i, { coins: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
          </div>
          <input placeholder="العنوان (عربي)" value={r.title_ar} onChange={(e) => edit(i, { title_ar: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" />
          <textarea placeholder="الوصف" value={r.description_ar ?? ""} onChange={(e) => edit(i, { description_ar: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" rows={2} />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <select value={r.threshold_kind} onChange={(e) => edit(i, { threshold_kind: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm">
              <option value="chapters_read">فصول مقروءة</option>
              <option value="novels_completed">روايات مكتملة</option>
              <option value="comments_posted">تعليقات</option>
              <option value="reviews_posted">مراجعات</option>
              <option value="streak_days">أيام تتابع</option>
              <option value="referrals">إحالات</option>
              <option value="level">المستوى</option>
              <option value="coins_earned">عملات مكتسبة</option>
            </select>
            <input type="number" placeholder="القيمة" value={r.threshold_value} onChange={(e) => edit(i, { threshold_value: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input placeholder="كود الشارة (اختياري)" value={r.badge_code ?? ""} onChange={(e) => edit(i, { badge_code: e.target.value || null })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.enabled} onChange={(e) => edit(i, { enabled: e.target.checked })} />فعّال</label>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save(r)}><Save className="h-3 w-3" /> حفظ</Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.code)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgesEditor() {
  const [rows, setRows] = useState<Badge[]>([]);
  async function load() {
    const { data } = await supabase.from("badges").select("*").order("sort_order");
    setRows((data ?? []) as Badge[]);
  }
  useEffect(() => { void load(); }, []);
  function edit(i: number, patch: Partial<Badge>) { setRows((v) => v.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  async function save(r: Badge) {
    const { error } = await supabase.from("badges").upsert(r);
    if (error) toast.error(error.message); else { toast.success("تم الحفظ"); void load(); }
  }
  async function del(code: string) {
    if (!confirm("حذف الشارة؟")) return;
    const { error } = await supabase.from("badges").delete().eq("code", code);
    if (error) toast.error(error.message); else void load();
  }
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={() => setRows((v) => [...v, { code: "", title_ar: "", description: "", icon: "🎖", rarity: "common", sort_order: v.length, enabled: true }])}>
        <Plus className="h-4 w-4" /> إضافة شارة
      </Button>
      {rows.map((r, i) => (
        <div key={r.code || i} className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input placeholder="code" value={r.code} onChange={(e) => edit(i, { code: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input placeholder="أيقونة" value={r.icon ?? ""} onChange={(e) => edit(i, { icon: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <select value={r.rarity} onChange={(e) => edit(i, { rarity: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm">
              <option value="common">عادي</option>
              <option value="rare">نادر</option>
              <option value="epic">ملحمي</option>
              <option value="legendary">أسطوري</option>
            </select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.enabled} onChange={(e) => edit(i, { enabled: e.target.checked })} />فعّال</label>
          </div>
          <input placeholder="الاسم" value={r.title_ar} onChange={(e) => edit(i, { title_ar: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" />
          <textarea placeholder="الوصف" value={r.description ?? ""} onChange={(e) => edit(i, { description: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" rows={2} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save(r)}><Save className="h-3 w-3" /> حفظ</Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.code)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
