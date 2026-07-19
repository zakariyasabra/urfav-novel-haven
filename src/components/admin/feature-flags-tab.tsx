// Admin · Feature Flags tab — Phase 7
// Toggle every Phase 7 platform capability without redeploying.

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Flag as FlagIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { invalidateFeatureFlagsCache, type FeatureFlagKey } from "@/lib/feature-flags";

interface Row {
  key: FeatureFlagKey;
  label: string;
  enabled: boolean;
}

const FLAGS: { key: FeatureFlagKey; label_ar: string; group: string }[] = [
  { key: "battle_pass",         label_ar: "Battle Pass",                    group: "monetization" },
  { key: "payments",            label_ar: "المدفوعات (مزوّدات جديدة)",       group: "monetization" },
  { key: "premium_chapters",    label_ar: "الفصول المميزة",                  group: "monetization" },
  { key: "premium_rental",      label_ar: "استئجار الفصول",                  group: "monetization" },
  { key: "premium_purchase",    label_ar: "شراء الفصول (دائم)",              group: "monetization" },
  { key: "author_donations",    label_ar: "التبرعات والإكراميات للمؤلفين",   group: "monetization" },
  { key: "reading_clubs",       label_ar: "نوادي القراءة",                   group: "community" },
  { key: "club_realtime_chat",  label_ar: "الدردشة الفورية داخل النوادي",    group: "community" },
  { key: "messaging",           label_ar: "الرسائل الخاصة",                  group: "community" },
  { key: "ai_features",         label_ar: "مساعد الذكاء الاصطناعي",          group: "ai" },
  { key: "recommendations_v2",  label_ar: "التوصيات V2 (Embeddings)",        group: "ai" },
  { key: "creator_studio",      label_ar: "استوديو المبدع",                  group: "author" },
  { key: "notification_center", label_ar: "مركز الإشعارات",                  group: "system" },
  { key: "global_search_v2",    label_ar: "البحث الشامل V2",                 group: "system" },
];

const GROUP_LABEL: Record<string, string> = {
  monetization: "الاقتصاد والمدفوعات",
  community:    "المجتمع",
  ai:           "الذكاء الاصطناعي",
  author:       "المؤلفون",
  system:       "النظام",
};

export function FeatureFlagsTab() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());

  async function reload() {
    const { data } = await supabase
      .from("site_settings")
      .select("key,value")
      .like("key", "feature_flag:%");
    const map = new Map<string, boolean>();
    for (const r of (data ?? []) as { key: string; value: { enabled?: boolean } | null }[]) {
      map.set(r.key.replace(/^feature_flag:/, ""), Boolean(r.value?.enabled));
    }
    setRows(FLAGS.map((f) => ({ key: f.key, label: f.label_ar, enabled: map.get(f.key) ?? false })));
  }

  useEffect(() => { reload(); }, []);

  async function toggle(key: FeatureFlagKey, next: boolean) {
    setBusy((s) => new Set(s).add(key));
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          { key: `feature_flag:${key}`, value: { enabled: next, label: FLAGS.find((f) => f.key === key)?.label_ar } },
          { onConflict: "key" },
        );
      if (error) throw error;
      invalidateFeatureFlagsCache();
      setRows((prev) => prev?.map((r) => (r.key === key ? { ...r, enabled: next } : r)) ?? null);
      toast.success(next ? "تم التفعيل" : "تم الإيقاف");
    } catch (e) {
      toast.error(String((e as Error).message));
    } finally {
      setBusy((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  }

  if (!rows) {
    return <div className="grid place-items-center p-10 text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  const grouped = new Map<string, Row[]>();
  for (const f of FLAGS) {
    const row = rows.find((r) => r.key === f.key);
    if (!row) continue;
    const arr = grouped.get(f.group) ?? [];
    arr.push(row);
    grouped.set(f.group, arr);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FlagIcon className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-black">مفاتيح الميزات</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        تفعيل وإيقاف الميزات الجديدة دون إعادة نشر. التغييرات تُطبَّق خلال دقيقة على جميع المستخدمين.
      </p>

      {Array.from(grouped.entries()).map(([group, list]) => (
        <section key={group} className="rounded-2xl border border-border/60 bg-surface/40 p-4">
          <h3 className="mb-3 text-sm font-black text-primary">{GROUP_LABEL[group] ?? group}</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((r) => (
              <label
                key={r.key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border/40 bg-background/40 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{r.label}</div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{r.key}</div>
                </div>
                <button
                  disabled={busy.has(r.key)}
                  onClick={() => toggle(r.key, !r.enabled)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${r.enabled ? "bg-primary" : "bg-secondary"}`}
                  aria-pressed={r.enabled}
                  aria-label={r.label}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${r.enabled ? "translate-x-5 rtl:-translate-x-5" : "translate-x-0.5 rtl:-translate-x-0.5"}`}
                  />
                </button>
              </label>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
