import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, Trash2, Star, Coins } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  fetchCoinPackages,
  upsertCoinPackage,
  deleteCoinPackage,
  type CoinPackage,
} from "@/lib/pricing-api";
import { showError } from "@/lib/errors";
import { confirmDialog } from "@/components/ui/dialog-service";
import { useT } from "@/i18n/provider";

type Draft = Partial<CoinPackage> & { code: string; coins: number };

const EMPTY: Draft = {
  code: "",
  coins: 100,
  bonus_coins: 0,
  price_usd_cents: 99,
  price_egp_cents: 5000,
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

export function CoinPackagesTab() {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-coin-packages"], queryFn: () => fetchCoinPackages(true) });
  const [draft, setDraft] = useState<Draft | null>(null);

  async function save() {
    if (!draft) return;
    if (!draft.code.trim()) return toast.error(t("pkg.err.code"));
    if (!draft.coins || draft.coins <= 0) return toast.error(t("pkg.err.coins"));
    try {
      await upsertCoinPackage({
        ...draft,
        code: draft.code.trim(),
        coins: Number(draft.coins),
        bonus_coins: Number(draft.bonus_coins ?? 0),
        price_usd_cents: draft.price_usd_cents != null ? Number(draft.price_usd_cents) : null,
        price_egp_cents: draft.price_egp_cents != null ? Number(draft.price_egp_cents) : null,
        sort_order: Number(draft.sort_order ?? 0),
      });
      toast.success(t("pkg.saved"));
      qc.invalidateQueries({ queryKey: ["admin-coin-packages"] });
      qc.invalidateQueries({ queryKey: ["coin-packages"] });
      setDraft(null);
    } catch (e) {
      showError(e);
    }
  }

  async function remove(id: string) {
    if (
      !(await confirmDialog({
        title: t("pkg.deleteTitle"),
        body: t("pkg.deleteBody"),
        danger: true,
      }))
    )
      return;
    try {
      await deleteCoinPackage(id);
      toast.success(t("pkg.deleted"));
      qc.invalidateQueries({ queryKey: ["admin-coin-packages"] });
      qc.invalidateQueries({ queryKey: ["coin-packages"] });
    } catch (e) {
      showError(e);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-black">{t("pkg.title")}</h3>
        <Button size="sm" onClick={() => setDraft({ ...EMPTY })}>
          <Plus className="me-1 h-4 w-4" />
          {t("pkg.new")}
        </Button>
      </div>

      {draft && (
        <PackageForm
          draft={draft}
          setDraft={setDraft}
          onSave={save}
          onCancel={() => setDraft(null)}
        />
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(q.data ?? []).map((p) => (
          <div
            key={p.id}
            className={`rounded-xl border p-4 ${p.is_active ? "border-border/40 bg-surface/40" : "border-dashed border-border/40 bg-surface/20 opacity-70"}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="h-4 w-4 text-primary" />
                <span className="font-black">{p.coins.toLocaleString()}</span>
                {p.bonus_coins > 0 && (
                  <span className="text-xs text-primary">+{p.bonus_coins}</span>
                )}
                {p.is_popular && <Star className="h-3.5 w-3.5 fill-primary text-primary" />}
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{p.code}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {p.price_usd_cents != null && <>${(p.price_usd_cents / 100).toFixed(2)}</>}
              {p.price_usd_cents != null && p.price_egp_cents != null && " · "}
              {p.price_egp_cents != null && (
                <>
                  {(p.price_egp_cents / 100).toFixed(2)} {t("pkg.egpSuffix")}
                </>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setDraft(p)}>
                {t("common.edit")}
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(p.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {q.data?.length === 0 && !draft && (
          <div className="col-span-full rounded-lg border border-dashed border-border/50 p-8 text-center text-sm text-muted-foreground">
            {t("pkg.empty")}
          </div>
        )}
      </div>
    </div>
  );
}

function PackageForm({
  draft,
  setDraft,
  onSave,
  onCancel,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const upd = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft({ ...draft, [k]: v });
  return (
    <div className="rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Field
          label={t("pkg.form.code")}
          value={draft.code}
          onChange={(v) => upd("code", v)}
          placeholder="starter"
        />
        <NumField
          label={t("pkg.form.coins")}
          value={draft.coins}
          onChange={(v) => upd("coins", v)}
        />
        <NumField
          label={t("pkg.form.bonus")}
          value={draft.bonus_coins ?? 0}
          onChange={(v) => upd("bonus_coins", v)}
        />
        <NumField
          label={t("pkg.form.priceUsd")}
          value={draft.price_usd_cents ?? 0}
          onChange={(v) => upd("price_usd_cents", v)}
          hint={t("pkg.form.priceUsdHint")}
        />
        <NumField
          label={t("pkg.form.priceEgp")}
          value={draft.price_egp_cents ?? 0}
          onChange={(v) => upd("price_egp_cents", v)}
          hint={t("pkg.form.priceEgpHint")}
        />
        <NumField
          label={t("pkg.form.sortOrder")}
          value={draft.sort_order ?? 0}
          onChange={(v) => upd("sort_order", v)}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <Toggle
          label={t("pkg.bestseller")}
          value={!!draft.is_popular}
          onChange={(v) => upd("is_popular", v)}
        />
        <Toggle
          label={t("pkg.active")}
          value={draft.is_active !== false}
          onChange={(v) => upd("is_active", v)}
        />
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button onClick={onSave}>
          <Save className="me-1 h-4 w-4" />
          {t("common.save")}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
      />
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        dir="ltr"
        className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm outline-none focus:border-primary"
      />
      {hint && <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div>}
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
    <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${value ? "start-0.5" : "end-0.5"}`}
        />
      </button>
      {label}
    </label>
  );
}
