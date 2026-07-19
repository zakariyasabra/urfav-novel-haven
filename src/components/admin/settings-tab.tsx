import { showError } from "@/lib/errors";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { fetchCurrencySettings, updateCurrencySettings } from "@/lib/pricing-api";
import { useT } from "@/i18n/provider";

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

export function SettingsTab() {
  const t = useT();
  const DEFAULTS: Settings = {
    site_name: "FAVNOL",
    tagline: t("settingsT.tagline.default"),
    contact_email: "",
    discord_url: "",
    telegram_url: "",
    ads_enabled: true,
    vip_enabled: true,
    registrations_open: true,
    announcement: "",
  };
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [rate, setRate] = useState<string>("50");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_settings").select("key,value");
      const merged: Settings = { ...DEFAULTS };
      for (const row of data ?? []) {
        const v = (row as { value: unknown }).value;
        (merged as unknown as Record<string, unknown>)[(row as { key: string }).key] = v;
      }
      setS(merged);
      const cur = await fetchCurrencySettings();
      setRate(String(cur.egp_per_usd));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    setBusy(true);
    const rows = Object.entries(s).map(([key, value]) => ({ key, value: value as never }));
    const { error } = await supabase.from("site_settings").upsert(rows, { onConflict: "key" });
    setBusy(false);
    if (error) return showError(error);
    toast.success(t("settingsT.saved"));
  }

  async function saveRate() {
    const n = parseFloat(rate);
    if (!Number.isFinite(n) || n <= 0) return toast.error(t("settingsT.currency.invalid"));
    try {
      await updateCurrencySettings({ egp_per_usd: n });
      toast.success(t("settingsT.currency.updated"));
    } catch (e) {
      showError(e);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Field
          label={t("settingsT.siteName")}
          value={s.site_name}
          onChange={(v) => setS({ ...s, site_name: v })}
        />
        <Field
          label={t("settingsT.tagline")}
          value={s.tagline}
          onChange={(v) => setS({ ...s, tagline: v })}
        />
        <Field
          label={t("settingsT.contactEmail")}
          value={s.contact_email}
          onChange={(v) => setS({ ...s, contact_email: v })}
        />
        <Field
          label={t("settingsT.discord")}
          value={s.discord_url}
          onChange={(v) => setS({ ...s, discord_url: v })}
        />
        <Field
          label={t("settingsT.telegram")}
          value={s.telegram_url}
          onChange={(v) => setS({ ...s, telegram_url: v })}
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-semibold">{t("settingsT.announcement")}</label>
        <textarea
          value={s.announcement}
          onChange={(e) => setS({ ...s, announcement: e.target.value })}
          rows={2}
          placeholder={t("settingsT.announcementPh")}
          className="w-full resize-none rounded-md border border-input bg-background/60 p-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid gap-2 rounded-xl border border-border/40 bg-surface/40 p-4 md:grid-cols-3">
        <Toggle
          label={t("settingsT.adsEnabled")}
          value={s.ads_enabled}
          onChange={(v) => setS({ ...s, ads_enabled: v })}
        />
        <Toggle
          label={t("settingsT.vipEnabled")}
          value={s.vip_enabled}
          onChange={(v) => setS({ ...s, vip_enabled: v })}
        />
        <Toggle
          label={t("settingsT.regOpen")}
          value={s.registrations_open}
          onChange={(v) => setS({ ...s, registrations_open: v })}
        />
      </div>

      <div className="rounded-xl border border-border/40 bg-surface/40 p-4">
        <div className="mb-2 text-sm font-black">{t("settingsT.currency.title")}</div>
        <div className="text-xs text-muted-foreground mb-3">{t("settingsT.currency.desc")}</div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-semibold">
              {t("settingsT.currency.rate")}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              dir="ltr"
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
            />
          </div>
          <Button onClick={saveRate} variant="secondary">
            {t("settingsT.currency.saveRate")}
          </Button>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          disabled={busy}
          onClick={save}
          className="bg-gradient-to-r from-primary to-primary-glow text-primary-foreground"
        >
          <Save className="me-1 h-4 w-4" />
          {busy ? t("settingsT.savingBtn") : t("settingsT.saveBtn")}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border/40 bg-background/40 p-3">
      <span className="text-sm font-semibold">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? "start-0.5 translate-x-0" : "end-0.5"}`}
        />
      </button>
    </label>
  );
}
