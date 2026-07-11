import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface Settings {
  site_name: string;
  tagline: string;
  contact_email: string;
  discord_url: string;
  telegram_url: string;
  ads_enabled: boolean;
  vip_enabled: boolean;
  registrations_open: boolean;
  announcement: string;
}

const DEFAULTS: Settings = {
  site_name: "UR Fav Novel",
  tagline: "بوابتك إلى أروع الروايات المترجمة",
  contact_email: "",
  discord_url: "",
  telegram_url: "",
  ads_enabled: true,
  vip_enabled: true,
  registrations_open: true,
  announcement: "",
};

export function SettingsTab() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("key,value");
      const merged: Settings = { ...DEFAULTS };
      for (const row of data ?? []) {
        const v = (row as { value: unknown }).value;
        (merged as unknown as Record<string, unknown>)[(row as { key: string }).key] = v;
      }
      setS(merged);
    })();
  }, []);

  async function save() {
    setBusy(true);
    const rows = Object.entries(s).map(([key, value]) => ({ key, value: value as never }));
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="اسم الموقع" value={s.site_name} onChange={(v) => setS({ ...s, site_name: v })} />
        <Field label="الشعار / الوصف" value={s.tagline} onChange={(v) => setS({ ...s, tagline: v })} />
        <Field label="البريد الإلكتروني" value={s.contact_email} onChange={(v) => setS({ ...s, contact_email: v })} />
        <Field label="رابط Discord" value={s.discord_url} onChange={(v) => setS({ ...s, discord_url: v })} />
        <Field label="رابط Telegram" value={s.telegram_url} onChange={(v) => setS({ ...s, telegram_url: v })} />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold">إعلان الشريط العلوي</label>
        <textarea value={s.announcement} onChange={(e) => setS({ ...s, announcement: e.target.value })}
          rows={2} placeholder="اتركه فارغاً لإخفاء الشريط"
          className="w-full resize-none rounded-md border border-input bg-background/60 p-3 text-sm outline-none focus:border-primary" />
      </div>

      <div className="grid gap-2 rounded-xl border border-border/40 bg-surface/40 p-4 md:grid-cols-3">
        <Toggle label="الإعلانات مفعّلة" value={s.ads_enabled} onChange={(v) => setS({ ...s, ads_enabled: v })} />
        <Toggle label="VIP مفعّل" value={s.vip_enabled} onChange={(v) => setS({ ...s, vip_enabled: v })} />
        <Toggle label="التسجيل مفتوح" value={s.registrations_open} onChange={(v) => setS({ ...s, registrations_open: v })} />
      </div>

      <div className="flex justify-end">
        <Button disabled={busy} onClick={save} className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground">
          <Save className="me-1 h-4 w-4" />{busy ? "جاري الحفظ..." : "حفظ الإعدادات"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary" />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 p-3">
      <span className="text-sm font-semibold">{label}</span>
      <button type="button" onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? "start-0.5 translate-x-0" : "end-0.5"}`} />
      </button>
    </label>
  );
}
