import { useEffect, useState } from "react";
import { Award, Save, Trash2, Plus, UserPlus, BarChart3, Wand2, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  gmAdminGrantAchievement,
  gmAdminGrantBadge,
  gmMissionAnalytics,
  gmGenerateMissions,
  type GmMissionAnalytics,
} from "@/lib/gamification-api";

interface XpRule {
  code: string;
  xp: number;
  coins: number;
  daily_cap: number;
  coin_daily_cap: number;
  label_ar: string | null;
  enabled: boolean;
}
interface EconomyConfig {
  coin_daily_cap: number;
  coin_weekly_cap: number;
  vip_xp_mult: number;
  vip_coin_mult: number;
  exempt_codes: string[];
}
const DEFAULT_ECONOMY: EconomyConfig = {
  coin_daily_cap: 25,
  coin_weekly_cap: 120,
  vip_xp_mult: 2,
  vip_coin_mult: 1.25,
  exempt_codes: ["signup", "invited"],
};

interface Achievement {
  code: string;
  title_ar: string;
  title_en?: string | null;
  description_ar: string | null;
  description_en?: string | null;
  icon: string | null;
  xp: number;
  coins: number;
  threshold_kind: string;
  threshold_value: number;
  badge_code: string | null;
  sort_order: number;
  enabled: boolean;
  category: string;
  rarity: string;
  hidden: boolean;
}
interface Badge {
  code: string;
  title_ar: string;
  title_en?: string | null;
  description: string | null;
  description_ar?: string | null;
  icon: string | null;
  color?: string | null;
  animation?: string | null;
  rarity: string;
  sort_order: number;
  enabled: boolean;
}

export function GamificationTab() {
  const [tab, setTab] = useState<
    "rules" | "achievements" | "badges" | "missions" | "challenges" | "grant" | "analytics"
  >("rules");
  const TAB_LABELS: Record<typeof tab, string> = {
    rules: "قواعد XP",
    achievements: "الإنجازات",
    badges: "الشارات",
    missions: "المهام اليومية",
    challenges: "التحديات الأسبوعية",
    grant: "منح يدوي",
    analytics: "تحليلات المهام",
  };
  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Award className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">نظام التحفيز (XP • عملات • إنجازات • تحديات)</h2>
      </div>
      <div className="mb-4 flex flex-wrap gap-2 border-b border-border/40">
        {(
          [
            "rules",
            "achievements",
            "badges",
            "missions",
            "challenges",
            "grant",
            "analytics",
          ] as const
        ).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm font-semibold transition ${tab === k ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
          >
            {TAB_LABELS[k]}
          </button>
        ))}
      </div>
      {tab === "rules" && <RulesEditor />}
      {tab === "achievements" && <AchievementsEditor />}
      {tab === "badges" && <BadgesEditor />}
      {tab === "missions" && <MissionsEditor />}
      {tab === "challenges" && <ChallengesEditor />}
      {tab === "grant" && <ManualGrant />}
      {tab === "analytics" && <MissionAnalyticsPanel />}
    </div>
  );
}

function EconomyCapsPanel() {
  const [cfg, setCfg] = useState<EconomyConfig>(DEFAULT_ECONOMY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "gamification_economy")
        .maybeSingle();
      const v = (data?.value ?? null) as Partial<EconomyConfig> | null;
      if (v && typeof v === "object") setCfg({ ...DEFAULT_ECONOMY, ...v });
      setLoading(false);
    })();
  }, []);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("site_settings")
      .upsert({ key: "gamification_economy", value: cfg as never });
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("تم حفظ سقوف الاقتصاد");
  }

  if (loading) return null;
  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
      <div className="mb-1 flex items-center gap-2 text-sm font-bold">
        <Coins className="h-4 w-4 text-primary" />
        سقوف الاقتصاد العامة
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        هذه السقوف تُطبَّق على مجموع العملات من كل مصادر التحفيز (قواعد • مهام • تحديات • إنجازات).
        XP غير محدود بها.
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <label className="text-xs">
          سقف العملات اليومي
          <input
            type="number"
            value={cfg.coin_daily_cap}
            onChange={(e) => setCfg({ ...cfg, coin_daily_cap: +e.target.value })}
            className="mt-1 w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          سقف العملات الأسبوعي
          <input
            type="number"
            value={cfg.coin_weekly_cap}
            onChange={(e) => setCfg({ ...cfg, coin_weekly_cap: +e.target.value })}
            className="mt-1 w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          مضاعف XP لـ VIP
          <input
            type="number"
            step="0.25"
            value={cfg.vip_xp_mult}
            onChange={(e) => setCfg({ ...cfg, vip_xp_mult: +e.target.value })}
            className="mt-1 w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
        </label>
        <label className="text-xs">
          مضاعف العملات لـ VIP
          <input
            type="number"
            step="0.25"
            value={cfg.vip_coin_mult}
            onChange={(e) => setCfg({ ...cfg, vip_coin_mult: +e.target.value })}
            className="mt-1 w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
        </label>
      </div>
      <label className="mt-3 block text-xs">
        أكواد مستثناة من السقف (مرة واحدة في العمر) — مفصولة بفاصلة
        <input
          value={cfg.exempt_codes.join(",")}
          onChange={(e) =>
            setCfg({
              ...cfg,
              exempt_codes: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          className="mt-1 w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
        />
      </label>
      <Button size="sm" className="mt-3" disabled={saving} onClick={() => void save()}>
        <Save className="mr-1 h-3 w-3" /> حفظ السقوف
      </Button>
    </div>
  );
}

function RulesEditor() {
  const [rows, setRows] = useState<XpRule[]>([]);
  const [loading, setLoading] = useState(true);
  async function load() {
    setLoading(true);
    const { data } = await supabase.from("xp_rules").select("*").order("code");
    setRows(
      ((data ?? []) as unknown as XpRule[]).map((r) => ({
        ...r,
        coin_daily_cap: r.coin_daily_cap ?? 0,
        label_ar: r.label_ar ?? null,
      })),
    );
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(i: number, patch: Partial<XpRule>) {
    setRows((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  async function save(r: XpRule) {
    const { error } = await supabase.from("xp_rules").upsert(r as never);
    if (error) toast.error(error.message);
    else toast.success("تم الحفظ");
  }
  if (loading) return <div className="py-8 text-center text-muted-foreground">جاري التحميل…</div>;
  return (
    <div className="space-y-2">
      <EconomyCapsPanel />
      <div className="hidden gap-2 px-3 text-[11px] text-muted-foreground md:grid md:grid-cols-[1fr,150px,70px,70px,90px,110px,70px,auto]">
        <span>الكود</span>
        <span>الاسم بالعربي</span>
        <span>XP</span>
        <span>عملات</span>
        <span>حد العمليات/يوم</span>
        <span>حد العملات/يوم</span>
        <span>فعّال</span>
        <span />
      </div>
      {rows.map((r, i) => (
        <div
          key={r.code}
          className="grid grid-cols-2 gap-2 rounded-lg border border-border/40 bg-card/60 p-3 md:grid-cols-[1fr,150px,70px,70px,90px,110px,70px,auto]"
        >
          <div className="col-span-2 md:col-span-1">
            <div className="font-bold text-sm">{r.code}</div>
          </div>
          <input
            value={r.label_ar ?? ""}
            onChange={(e) => edit(i, { label_ar: e.target.value })}
            className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            placeholder="الاسم بالعربي"
          />
          <input
            type="number"
            value={r.xp}
            onChange={(e) => edit(i, { xp: +e.target.value })}
            className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            placeholder="XP"
          />
          <input
            type="number"
            value={r.coins}
            onChange={(e) => edit(i, { coins: +e.target.value })}
            className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            placeholder="عملات"
          />
          <input
            type="number"
            value={r.daily_cap}
            onChange={(e) => edit(i, { daily_cap: +e.target.value })}
            className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            placeholder="حد يومي"
          />
          <input
            type="number"
            value={r.coin_daily_cap}
            onChange={(e) => edit(i, { coin_daily_cap: +e.target.value })}
            className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            placeholder="حد العملات/يوم"
          />
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={r.enabled}
              onChange={(e) => edit(i, { enabled: e.target.checked })}
            />
            فعّال
          </label>
          <Button size="sm" onClick={() => save(r)}>
            <Save className="h-3 w-3" />
          </Button>
        </div>
      ))}
      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border/40 p-8 text-center text-sm text-muted-foreground">
          لا توجد قواعد بعد.
        </div>
      ) : null}
    </div>
  );
}


function AchievementsEditor() {
  const [rows, setRows] = useState<Achievement[]>([]);
  async function load() {
    const { data } = await supabase.from("achievements").select("*").order("sort_order");
    setRows((data ?? []) as Achievement[]);
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(i: number, patch: Partial<Achievement>) {
    setRows((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  async function save(r: Achievement) {
    const { error } = await supabase.from("achievements").upsert(r);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحفظ");
      void load();
    }
  }
  async function del(code: string) {
    if (!confirm("حذف الإنجاز؟")) return;
    const { error } = await supabase.from("achievements").delete().eq("code", code);
    if (error) toast.error(error.message);
    else void load();
  }
  return (
    <div className="space-y-3">
      <Button
        size="sm"
        onClick={() =>
          setRows((v) => [
            ...v,
            {
              code: "",
              title_ar: "",
              description_ar: "",
              icon: "🏆",
              xp: 0,
              coins: 0,
              threshold_kind: "chapters_read",
              threshold_value: 10,
              badge_code: null,
              sort_order: v.length,
              enabled: true,
              category: "reading",
              rarity: "common",
              hidden: false,
            },
          ])
        }
      >
        <Plus className="h-4 w-4" /> إضافة إنجاز
      </Button>
      {rows.map((r, i) => (
        <div
          key={r.code || i}
          className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3"
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input
              placeholder="code"
              value={r.code}
              onChange={(e) => edit(i, { code: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              placeholder="أيقونة"
              value={r.icon ?? ""}
              onChange={(e) => edit(i, { icon: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="XP"
              value={r.xp}
              onChange={(e) => edit(i, { xp: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="عملات"
              value={r.coins}
              onChange={(e) => edit(i, { coins: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
          </div>
          <input
            placeholder="العنوان (عربي)"
            value={r.title_ar}
            onChange={(e) => edit(i, { title_ar: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <input
            placeholder="Title (EN)"
            value={r.title_en ?? ""}
            onChange={(e) => edit(i, { title_en: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <textarea
            placeholder="الوصف"
            value={r.description_ar ?? ""}
            onChange={(e) => edit(i, { description_ar: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <select
              value={r.category}
              onChange={(e) => edit(i, { category: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="reading">القراءة</option>
              <option value="community">المجتمع</option>
              <option value="author">الكتّاب</option>
              <option value="social">التواصل</option>
              <option value="vip">VIP</option>
              <option value="events">الفعاليات</option>
            </select>
            <select
              value={r.rarity}
              onChange={(e) => edit(i, { rarity: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="common">عادي</option>
              <option value="rare">نادر</option>
              <option value="epic">ملحمي</option>
              <option value="legendary">أسطوري</option>
            </select>
            <select
              value={r.threshold_kind}
              onChange={(e) => edit(i, { threshold_kind: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="chapters_read">فصول مقروءة</option>
              <option value="novels_completed">روايات مكتملة</option>
              <option value="comments_posted">تعليقات</option>
              <option value="reviews_posted">مراجعات</option>
              <option value="streak_days">أيام تتابع</option>
              <option value="referrals">إحالات</option>
              <option value="level">المستوى</option>
              <option value="coins_earned">عملات مكتسبة</option>
              <option value="novels_published">روايات منشورة</option>
              <option value="favorites">مفضلات</option>
            </select>
            <input
              type="number"
              placeholder="القيمة"
              value={r.threshold_value}
              onChange={(e) => edit(i, { threshold_value: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input
              placeholder="كود الشارة (اختياري)"
              value={r.badge_code ?? ""}
              onChange={(e) => edit(i, { badge_code: e.target.value || null })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="ترتيب"
              value={r.sort_order}
              onChange={(e) => edit(i, { sort_order: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => edit(i, { enabled: e.target.checked })}
              />
              فعّال
            </label>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={r.hidden}
                onChange={(e) => edit(i, { hidden: e.target.checked })}
              />
              مخفي
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save(r)}>
              <Save className="h-3 w-3" /> حفظ
            </Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.code)}>
              <Trash2 className="h-3 w-3" />
            </Button>
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
  useEffect(() => {
    void load();
  }, []);
  function edit(i: number, patch: Partial<Badge>) {
    setRows((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  async function save(r: Badge) {
    const { error } = await supabase.from("badges").upsert(r);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحفظ");
      void load();
    }
  }
  async function del(code: string) {
    if (!confirm("حذف الشارة؟")) return;
    const { error } = await supabase.from("badges").delete().eq("code", code);
    if (error) toast.error(error.message);
    else void load();
  }
  return (
    <div className="space-y-3">
      <Button
        size="sm"
        onClick={() =>
          setRows((v) => [
            ...v,
            {
              code: "",
              title_ar: "",
              description: "",
              description_ar: "",
              icon: "🎖",
              color: "",
              animation: "",
              rarity: "common",
              sort_order: v.length,
              enabled: true,
            },
          ])
        }
      >
        <Plus className="h-4 w-4" /> إضافة شارة
      </Button>
      {rows.map((r, i) => (
        <div
          key={r.code || i}
          className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3"
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input
              placeholder="code"
              value={r.code}
              onChange={(e) => edit(i, { code: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              placeholder="أيقونة"
              value={r.icon ?? ""}
              onChange={(e) => edit(i, { icon: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <select
              value={r.rarity}
              onChange={(e) => edit(i, { rarity: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="common">عادي</option>
              <option value="rare">نادر</option>
              <option value="epic">ملحمي</option>
              <option value="legendary">أسطوري</option>
            </select>
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => edit(i, { enabled: e.target.checked })}
              />
              فعّال
            </label>
          </div>
          <input
            placeholder="الاسم"
            value={r.title_ar}
            onChange={(e) => edit(i, { title_ar: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <input
            placeholder="Title (EN)"
            value={r.title_en ?? ""}
            onChange={(e) => edit(i, { title_en: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <textarea
            placeholder="الوصف"
            value={r.description_ar ?? r.description ?? ""}
            onChange={(e) =>
              edit(i, { description_ar: e.target.value, description: e.target.value })
            }
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <input
              placeholder="اللون (#RRGGBB)"
              value={r.color ?? ""}
              onChange={(e) => edit(i, { color: e.target.value || null })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <select
              value={r.animation ?? ""}
              onChange={(e) => edit(i, { animation: e.target.value || null })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="">بدون حركة</option>
              <option value="pulse">نبض</option>
              <option value="shine">لمعان</option>
              <option value="bounce">قفز</option>
            </select>
            <input
              type="number"
              placeholder="ترتيب"
              value={r.sort_order}
              onChange={(e) => edit(i, { sort_order: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save(r)}>
              <Save className="h-3 w-3" /> حفظ
            </Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.code)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ManualGrant() {
  const [userQuery, setUserQuery] = useState("");
  const [candidates, setCandidates] = useState<
    Array<{ id: string; username: string | null; display_name: string | null }>
  >([]);
  const [selectedUser, setSelectedUser] = useState<{ id: string; label: string } | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [achCode, setAchCode] = useState("");
  const [badgeCode, setBadgeCode] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase
      .from("achievements")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setAchievements((data ?? []) as Achievement[]));
    void supabase
      .from("badges")
      .select("*")
      .order("sort_order")
      .then(({ data }) => setBadges((data ?? []) as Badge[]));
  }, []);

  async function search() {
    const q = userQuery.trim();
    if (q.length < 2) {
      setCandidates([]);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("id,username,display_name")
      .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
      .limit(10);
    setCandidates((data ?? []) as never);
  }

  async function grantAch() {
    if (!selectedUser || !achCode) return;
    setBusy(true);
    try {
      await gmAdminGrantAchievement(selectedUser.id, achCode);
      toast.success("تم منح الإنجاز");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function grantBadge() {
    if (!selectedUser || !badgeCode) return;
    setBusy(true);
    try {
      await gmAdminGrantBadge(selectedUser.id, badgeCode);
      toast.success("تم منح الشارة");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border/40 bg-card/60 p-4">
      <div className="flex items-center gap-2 text-sm font-bold">
        <UserPlus className="h-4 w-4 text-primary" /> منح إنجاز / شارة يدوياً
      </div>

      <div>
        <label className="mb-1 block text-xs text-muted-foreground">ابحث عن مستخدم</label>
        <div className="flex gap-2">
          <input
            value={userQuery}
            onChange={(e) => setUserQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
            placeholder="اسم المستخدم أو الاسم الظاهر"
            className="flex-1 rounded border border-border/40 bg-background px-2 py-1.5 text-sm"
          />
          <Button size="sm" onClick={() => void search()}>
            بحث
          </Button>
        </div>
        {candidates.length > 0 ? (
          <div className="mt-2 space-y-1">
            {candidates.map((c) => {
              const label = c.display_name || c.username || c.id.slice(0, 8);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedUser({ id: c.id, label });
                    setCandidates([]);
                    setUserQuery(label);
                  }}
                  className="block w-full rounded border border-border/40 bg-background px-2 py-1.5 text-start text-sm hover:border-primary/40"
                >
                  {label}{" "}
                  <span className="text-xs text-muted-foreground">@{c.username ?? "—"}</span>
                </button>
              );
            })}
          </div>
        ) : null}
        {selectedUser ? (
          <div className="mt-2 rounded bg-primary/10 px-2 py-1 text-xs text-primary">
            المحدد: {selectedUser.label}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-2 rounded border border-border/30 p-3">
          <div className="text-xs font-bold">إنجاز</div>
          <select
            value={achCode}
            onChange={(e) => setAchCode(e.target.value)}
            className="w-full rounded border border-border/40 bg-background px-2 py-1.5 text-sm"
          >
            <option value="">— اختر —</option>
            {achievements.map((a) => (
              <option key={a.code} value={a.code}>
                {a.icon} {a.title_ar}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!selectedUser || !achCode || busy}
            onClick={() => void grantAch()}
          >
            منح الإنجاز
          </Button>
        </div>
        <div className="space-y-2 rounded border border-border/30 p-3">
          <div className="text-xs font-bold">شارة</div>
          <select
            value={badgeCode}
            onChange={(e) => setBadgeCode(e.target.value)}
            className="w-full rounded border border-border/40 bg-background px-2 py-1.5 text-sm"
          >
            <option value="">— اختر —</option>
            {badges.map((b) => (
              <option key={b.code} value={b.code}>
                {b.icon} {b.title_ar}
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!selectedUser || !badgeCode || busy}
            onClick={() => void grantBadge()}
          >
            منح الشارة
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ Missions Editor ============
interface Mission {
  code: string;
  title_ar: string;
  title_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  icon?: string | null;
  difficulty: string;
  category: string;
  target_kind: string;
  target_value: number;
  xp: number;
  coins: number;
  sort_order: number;
  enabled: boolean;
}

function MissionsEditor() {
  const [rows, setRows] = useState<Mission[]>([]);
  async function load() {
    const { data } = await supabase.from("daily_missions").select("*").order("sort_order");
    setRows((data ?? []) as Mission[]);
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(i: number, patch: Partial<Mission>) {
    setRows((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  async function save(r: Mission) {
    if (!r.code || !r.title_ar) {
      toast.error("الرمز والعنوان مطلوبان");
      return;
    }
    const { error } = await supabase.from("daily_missions").upsert(r);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحفظ");
      void load();
    }
  }
  async function del(code: string) {
    if (!confirm("حذف المهمة؟")) return;
    const { error } = await supabase.from("daily_missions").delete().eq("code", code);
    if (error) toast.error(error.message);
    else void load();
  }

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        onClick={() =>
          setRows((v) => [
            ...v,
            {
              code: "",
              title_ar: "",
              description_ar: "",
              icon: "🎯",
              difficulty: "easy",
              category: "reading",
              target_kind: "read_chapter",
              target_value: 1,
              xp: 10,
              coins: 5,
              sort_order: v.length,
              enabled: true,
            },
          ])
        }
      >
        <Plus className="h-4 w-4" /> إضافة مهمة
      </Button>
      {rows.map((r, i) => (
        <div
          key={r.code || i}
          className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3"
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input
              placeholder="code"
              value={r.code}
              onChange={(e) => edit(i, { code: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              placeholder="أيقونة"
              value={r.icon ?? ""}
              onChange={(e) => edit(i, { icon: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="XP"
              value={r.xp}
              onChange={(e) => edit(i, { xp: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="عملات"
              value={r.coins}
              onChange={(e) => edit(i, { coins: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
          </div>
          <input
            placeholder="العنوان (عربي)"
            value={r.title_ar}
            onChange={(e) => edit(i, { title_ar: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <input
            placeholder="Title (EN)"
            value={r.title_en ?? ""}
            onChange={(e) => edit(i, { title_en: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <textarea
            placeholder="الوصف"
            value={r.description_ar ?? ""}
            onChange={(e) => edit(i, { description_ar: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <select
              value={r.category}
              onChange={(e) => edit(i, { category: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="reading">القراءة</option>
              <option value="community">المجتمع</option>
              <option value="social">التواصل</option>
              <option value="author">الكتّاب</option>
              <option value="login">دخول</option>
              <option value="events">الفعاليات</option>
            </select>
            <select
              value={r.difficulty}
              onChange={(e) => edit(i, { difficulty: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
            </select>
            <select
              value={r.target_kind}
              onChange={(e) => edit(i, { target_kind: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="read_chapter">قراءة فصل</option>
              <option value="read_minutes">دقائق قراءة</option>
              <option value="finish_novel">إنهاء رواية</option>
              <option value="favorite">إضافة مفضلة</option>
              <option value="review">مراجعة</option>
              <option value="comment">تعليق</option>
              <option value="receive_likes">استقبال إعجاب</option>
              <option value="follow_author">متابعة كاتب</option>
              <option value="share_novel">مشاركة رواية</option>
              <option value="visit">زيارة الموقع</option>
              <option value="daily_login">دخول يومي</option>
              <option value="rate_novel">تقييم رواية</option>
            </select>
            <input
              type="number"
              placeholder="القيمة"
              value={r.target_value}
              onChange={(e) => edit(i, { target_value: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            <input
              type="number"
              placeholder="ترتيب"
              value={r.sort_order}
              onChange={(e) => edit(i, { sort_order: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => edit(i, { enabled: e.target.checked })}
              />
              فعّالة
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save(r)}>
              <Save className="h-3 w-3" /> حفظ
            </Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.code)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============ Weekly Challenges Editor ============
interface Challenge {
  id?: string;
  title_ar: string;
  title_en?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  icon?: string | null;
  difficulty: string;
  category: string;
  target_kind: string;
  target_value: number;
  xp: number;
  coins: number;
  starts_at: string;
  ends_at: string;
  enabled: boolean;
}

function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function ChallengesEditor() {
  const [rows, setRows] = useState<Challenge[]>([]);
  async function load() {
    const { data } = await supabase
      .from("weekly_challenges")
      .select("*")
      .order("ends_at", { ascending: false });
    setRows((data ?? []) as Challenge[]);
  }
  useEffect(() => {
    void load();
  }, []);
  function edit(i: number, patch: Partial<Challenge>) {
    setRows((v) => v.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  }
  async function save(r: Challenge) {
    if (!r.title_ar) {
      toast.error("العنوان مطلوب");
      return;
    }
    const { error } = await supabase.from("weekly_challenges").upsert(r);
    if (error) toast.error(error.message);
    else {
      toast.success("تم الحفظ");
      void load();
    }
  }
  async function del(id?: string) {
    if (!id || !confirm("حذف التحدي؟")) return;
    const { error } = await supabase.from("weekly_challenges").delete().eq("id", id);
    if (error) toast.error(error.message);
    else void load();
  }

  return (
    <div className="space-y-3">
      <Button
        size="sm"
        onClick={() => {
          const now = new Date();
          const end = new Date(now.getTime() + 7 * 86400000);
          setRows((v) => [
            {
              title_ar: "",
              description_ar: "",
              icon: "🏆",
              difficulty: "medium",
              category: "reading",
              target_kind: "read_chapter",
              target_value: 50,
              xp: 300,
              coins: 60,
              starts_at: now.toISOString(),
              ends_at: end.toISOString(),
              enabled: true,
            },
            ...v,
          ]);
        }}
      >
        <Plus className="h-4 w-4" /> إضافة تحدٍ
      </Button>
      {rows.map((r, i) => (
        <div
          key={r.id ?? i}
          className="space-y-2 rounded-lg border border-border/40 bg-card/60 p-3"
        >
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <input
              placeholder="أيقونة"
              value={r.icon ?? ""}
              onChange={(e) => edit(i, { icon: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="XP"
              value={r.xp}
              onChange={(e) => edit(i, { xp: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <input
              type="number"
              placeholder="عملات"
              value={r.coins}
              onChange={(e) => edit(i, { coins: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
            <label className="flex items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={r.enabled}
                onChange={(e) => edit(i, { enabled: e.target.checked })}
              />
              فعّال
            </label>
          </div>
          <input
            placeholder="العنوان (عربي)"
            value={r.title_ar}
            onChange={(e) => edit(i, { title_ar: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <input
            placeholder="Title (EN)"
            value={r.title_en ?? ""}
            onChange={(e) => edit(i, { title_en: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
          />
          <textarea
            placeholder="الوصف"
            value={r.description_ar ?? ""}
            onChange={(e) => edit(i, { description_ar: e.target.value })}
            className="w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <select
              value={r.category}
              onChange={(e) => edit(i, { category: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="reading">القراءة</option>
              <option value="community">المجتمع</option>
              <option value="social">التواصل</option>
              <option value="author">الكتّاب</option>
              <option value="events">الفعاليات</option>
            </select>
            <select
              value={r.difficulty}
              onChange={(e) => edit(i, { difficulty: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
              <option value="extreme">أسطوري</option>
            </select>
            <select
              value={r.target_kind}
              onChange={(e) => edit(i, { target_kind: e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="read_chapter">فصول مقروءة</option>
              <option value="read_minutes">دقائق قراءة</option>
              <option value="finish_novel">إنهاء روايات</option>
              <option value="review">مراجعات</option>
              <option value="comment">تعليقات</option>
              <option value="referral">إحالات</option>
              <option value="complete_all_missions">إنهاء كل المهام</option>
              <option value="rate_novel">تقييم روايات</option>
            </select>
            <input
              type="number"
              placeholder="الهدف"
              value={r.target_value}
              onChange={(e) => edit(i, { target_value: +e.target.value })}
              className="rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <label className="text-xs">
              <span className="text-muted-foreground">يبدأ:</span>
              <input
                type="datetime-local"
                value={toLocalInput(r.starts_at)}
                onChange={(e) => edit(i, { starts_at: new Date(e.target.value).toISOString() })}
                className="mt-1 w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
              />
            </label>
            <label className="text-xs">
              <span className="text-muted-foreground">ينتهي:</span>
              <input
                type="datetime-local"
                value={toLocalInput(r.ends_at)}
                onChange={(e) => edit(i, { ends_at: new Date(e.target.value).toISOString() })}
                className="mt-1 w-full rounded border border-border/40 bg-background px-2 py-1 text-sm"
              />
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => save(r)}>
              <Save className="h-3 w-3" /> حفظ
            </Button>
            <Button size="sm" variant="destructive" onClick={() => del(r.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function MissionAnalyticsPanel() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<GmMissionAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [diff, setDiff] = useState<"easy" | "medium" | "hard" | "legendary">("medium");
  const [count, setCount] = useState(3);
  const [busy, setBusy] = useState(false);

  const load = () => {
    setLoading(true);
    void gmMissionAnalytics(days).then((d) => {
      setData(d);
      setLoading(false);
    });
  };
  useEffect(load, [days]);

  async function generate() {
    setBusy(true);
    try {
      const n = await gmGenerateMissions(diff, count);
      toast.success(`تم توليد ${n} مهمة (${diff})`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const maxCompleted = Math.max(1, ...(data?.timeseries ?? []).map((t) => t.completed));

  return (
    <div className="space-y-6">
      {/* Smart Generator */}
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">مولّد المهام الذكي</h3>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs">
            <span className="text-muted-foreground">الصعوبة</span>
            <select
              value={diff}
              onChange={(e) => setDiff(e.target.value as typeof diff)}
              className="mt-1 block rounded border border-border/40 bg-background px-2 py-1 text-sm"
            >
              <option value="easy">سهل</option>
              <option value="medium">متوسط</option>
              <option value="hard">صعب</option>
              <option value="legendary">أسطوري</option>
            </select>
          </label>
          <label className="text-xs">
            <span className="text-muted-foreground">العدد</span>
            <input
              type="number"
              min={1}
              max={10}
              value={count}
              onChange={(e) => setCount(Math.max(1, +e.target.value))}
              className="mt-1 block w-20 rounded border border-border/40 bg-background px-2 py-1 text-sm"
            />
          </label>
          <Button size="sm" onClick={generate} disabled={busy}>
            <Wand2 className="h-3 w-3" /> توليد
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-bold">تحليلات المهام</h3>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(+e.target.value)}
          className="rounded border border-border/40 bg-background px-2 py-1 text-xs"
        >
          <option value={7}>آخر 7 أيام</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-8 text-center text-sm text-muted-foreground">
          جاري التحميل…
        </div>
      ) : !data ? (
        <div className="rounded-2xl border border-border/40 bg-card/60 p-8 text-center text-sm text-muted-foreground">
          لا توجد بيانات
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="نشطون اليوم" value={data.daily_active} />
            <Kpi label="نشطون أسبوعياً" value={data.weekly_active} />
            <Kpi label="نسبة الإكمال" value={`${data.completion_rate}%`} />
            <Kpi label="متوسط الإكمال (د)" value={data.avg_completion_minutes ?? "—"} />
          </div>

          {/* Timeseries chart (simple SVG bars) */}
          {data.timeseries && data.timeseries.length > 0 ? (
            <div className="rounded-2xl border border-border/40 bg-card/60 p-4">
              <h4 className="mb-3 text-xs font-bold text-muted-foreground">إتمام المهام يومياً</h4>
              <div className="flex h-32 items-end gap-1">
                {data.timeseries.map((t) => (
                  <div
                    key={t.day}
                    className="group relative flex-1"
                    title={`${t.day}: ${t.completed}/${t.started}`}
                  >
                    <div
                      className="w-full rounded-t bg-primary/60 transition group-hover:bg-primary"
                      style={{ height: `${(t.completed / maxCompleted) * 100}%` }}
                    />
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                <span>{data.timeseries[0]?.day}</span>
                <span>{data.timeseries[data.timeseries.length - 1]?.day}</span>
              </div>
            </div>
          ) : null}

          {/* Per-mission table */}
          <div className="overflow-x-auto rounded-2xl border border-border/40 bg-card/60">
            <table className="w-full text-xs">
              <thead className="bg-background/60 text-muted-foreground">
                <tr>
                  <th className="p-2 text-start">المهمة</th>
                  <th className="p-2">الصعوبة</th>
                  <th className="p-2">بدأت</th>
                  <th className="p-2">أكملت</th>
                  <th className="p-2">استلمت</th>
                  <th className="p-2">النسبة</th>
                </tr>
              </thead>
              <tbody>
                {(data.per_mission ?? []).map((m) => (
                  <tr key={m.code} className="border-t border-border/40">
                    <td className="p-2 font-medium">{m.title_ar}</td>
                    <td className="p-2 text-center">{m.difficulty ?? "—"}</td>
                    <td className="p-2 text-center">{m.started}</td>
                    <td className="p-2 text-center text-emerald-400">{m.completed}</td>
                    <td className="p-2 text-center text-amber-400">{m.claimed}</td>
                    <td className="p-2 text-center">{m.completion_rate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 p-4 text-center">
      <div className="text-2xl font-black text-primary">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{label}</div>
    </div>
  );
}
