import { useEffect, useState } from "react";
import { Award, Save, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface XpRule { code: string; xp: number; coins: number; enabled: boolean; description: string | null }
interface Achievement { id?: string; code: string; title_ar: string; description_ar: string | null; icon: string | null; xp_reward: number; coin_reward: number; requirement: Record<string, unknown>; enabled: boolean }
interface Badge { id?: string; code: string; name_ar: string; description_ar: string | null; icon: string | null; tier: string; enabled: boolean }

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
    const { data } = await supabase.from("xp_rules").select("*").order("code");
    setRows((data ?? []) as XpRule[]);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);
  async function save(r: XpRule) {
    const { error } = await supabase.from("xp_rules").upsert(r);
    if (error) toast.error(error.message); else toast.success("تم الحفظ");
  }
  if (loading) return <div className="py-8 text-center text-muted-foreground">جاري التحميل…</div>;
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.code} className="grid grid-cols-1 gap-2 rounded-lg border border-border/40 bg-card/60 p-3 md:grid-cols-[1fr,80px,80px,80px,auto]">
          <div>
            <div className="font-bold text-sm">{r.code}</div>
            {r.description ? <div className="text-xs text-muted-foreground">{r.description}</div> : null}
          </div>
          <input type="number" value={r.xp} onChange={(e) => setRows((v) => v.map((x, j) => j === i ? { ...x, xp: +e.target.value } : x))} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" placeholder="XP" />
          <input type="number" value={r.coins} onChange={(e) => setRows((v) => v.map((x, j) => j === i ? { ...x, coins: +e.target.value } : x))} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" placeholder="عملات" />
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={r.enabled} onChange={(e) => setRows((v) => v.map((x, j) => j === i ? { ...x, enabled: e.target.checked } : x))} />فعّال</label>
          <Button size="sm" onClick={() => save(r)}><Save className="h-3 w-3" /></Button>
        </div>
      ))}
      {rows.length === 0 ? <div className="rounded-lg border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">لا توجد قواعد بعد. أضِف صفوفاً في جدول xp_rules.</div> : null}
    </div>
  );
}

function AchievementsEditor() {
  const [rows, setRows] = useState<Achievement[]>([]);
  async function load() {
    const { data } = await supabase.from("achievements").select("*").order("code");
    setRows((data ?? []) as Achievement[]);
  }
  useEffect(() => { void load(); }, []);
  function edit(i: number, patch: Partial<Achievement>) { setRows((v) => v.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  async function save(r: Achievement) {
    const { error } = await supabase.from("achievements").upsert(r);
    if (error) toast.error(error.message); else { toast.success("تم الحفظ"); void load(); }
  }
  async function del(id?: string) {
    if (!id) return;
    if (!confirm("حذف الإنجاز؟")) return;
    const { error } = await supabase.from("achievements").delete().eq("id", id);
    if (error) toast.error(error.message); else void load();
  }
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={() => setRows((v) => [...v, { code: "", title_ar: "", description_ar: "", icon: "🏆", xp_reward: 0, coin_reward: 0, requirement: {}, enabled: true }])}>
        <Plus className="h-4 w-4" /> إضافة إنجاز
      </Button>
      {rows.map((r, i) => (
        <div key={r.id ?? i} className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input placeholder="code" value={r.code} onChange={(e) => edit(i, { code: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input placeholder="أيقونة" value={r.icon ?? ""} onChange={(e) => edit(i, { icon: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input type="number" placeholder="XP" value={r.xp_reward} onChange={(e) => edit(i, { xp_reward: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input type="number" placeholder="عملات" value={r.coin_reward} onChange={(e) => edit(i, { coin_reward: +e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
          </div>
          <input placeholder="العنوان" value={r.title_ar} onChange={(e) => edit(i, { title_ar: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" />
          <textarea placeholder="الوصف" value={r.description_ar ?? ""} onChange={(e) => edit(i, { description_ar: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" rows={2} />
          <textarea placeholder='الشرط JSON (مثل {"chapters_read": 10})' value={JSON.stringify(r.requirement)} onChange={(e) => { try { edit(i, { requirement: JSON.parse(e.target.value) }); } catch { /* invalid */ } }} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-xs font-mono" rows={2} />
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.enabled} onChange={(e) => edit(i, { enabled: e.target.checked })} />فعّال</label>
            <Button size="sm" onClick={() => save(r)}><Save className="h-3 w-3" /> حفظ</Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function BadgesEditor() {
  const [rows, setRows] = useState<Badge[]>([]);
  async function load() {
    const { data } = await supabase.from("badges").select("*").order("code");
    setRows((data ?? []) as Badge[]);
  }
  useEffect(() => { void load(); }, []);
  function edit(i: number, patch: Partial<Badge>) { setRows((v) => v.map((x, j) => j === i ? { ...x, ...patch } : x)); }
  async function save(r: Badge) {
    const { error } = await supabase.from("badges").upsert(r);
    if (error) toast.error(error.message); else { toast.success("تم الحفظ"); void load(); }
  }
  async function del(id?: string) {
    if (!id) return;
    if (!confirm("حذف الشارة؟")) return;
    const { error } = await supabase.from("badges").delete().eq("id", id);
    if (error) toast.error(error.message); else void load();
  }
  return (
    <div className="space-y-3">
      <Button size="sm" onClick={() => setRows((v) => [...v, { code: "", name_ar: "", description_ar: "", icon: "🎖", tier: "bronze", enabled: true }])}>
        <Plus className="h-4 w-4" /> إضافة شارة
      </Button>
      {rows.map((r, i) => (
        <div key={r.id ?? i} className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input placeholder="code" value={r.code} onChange={(e) => edit(i, { code: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <input placeholder="أيقونة" value={r.icon ?? ""} onChange={(e) => edit(i, { icon: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm" />
            <select value={r.tier} onChange={(e) => edit(i, { tier: e.target.value })} className="rounded border border-border/40 bg-background px-2 py-1 text-sm">
              <option value="bronze">برونز</option>
              <option value="silver">فضة</option>
              <option value="gold">ذهب</option>
              <option value="platinum">بلاتين</option>
              <option value="diamond">ماس</option>
            </select>
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={r.enabled} onChange={(e) => edit(i, { enabled: e.target.checked })} />فعّال</label>
          </div>
          <input placeholder="الاسم" value={r.name_ar} onChange={(e) => edit(i, { name_ar: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" />
          <textarea placeholder="الوصف" value={r.description_ar ?? ""} onChange={(e) => edit(i, { description_ar: e.target.value })} className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm" rows={2} />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save(r)}><Save className="h-3 w-3" /> حفظ</Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      ))}
    </div>
  );
}
