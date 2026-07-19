import { showError } from "@/lib/errors";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { fetchAllAds, upsertAd, deleteAd, type AdRow } from "@/lib/monetization-api";
import { confirmDialog } from "@/components/ui/dialog-service";
import { useT } from "@/i18n/provider";

const SLOT_KEYS = [
  "home_top",
  "home_middle",
  "home_bottom",
  "sidebar",
  "reader_top",
  "reader_middle",
  "reader_bottom",
  "footer",
  "banner",
] as const;
const KIND_KEYS = ["adsense", "html", "image", "native"] as const;

export function AdsTab() {
  const t = useT();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ads-admin"], queryFn: fetchAllAds });
  const [editing, setEditing] = useState<AdRow | "new" | null>(null);

  async function toggle(a: AdRow) {
    await upsertAd({ ...a, enabled: !a.enabled });
    qc.invalidateQueries({ queryKey: ["ads-admin"] });
  }
  async function del(id: string) {
    if (
      !(await confirmDialog({
        title: t("admin.confirm"),
        body: t("adsT.deleteBody"),
        confirmLabel: t("admin.confirm"),
        danger: true,
      }))
    )
      return;
    await deleteAd(id);
    toast.success(t("adsT.deleted"));
    qc.invalidateQueries({ queryKey: ["ads-admin"] });
  }

  return (
    <div>
      <div className="mb-4 flex justify-between">
        <div className="text-sm text-muted-foreground">{t("adsT.desc")}</div>
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus className="me-1 h-4 w-4" />
          {t("adsT.new")}
        </Button>
      </div>
      <div className="space-y-2">
        {(q.data ?? []).map((a) => (
          <div
            key={a.id}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border/40 bg-surface/40 p-3"
          >
            <div className="min-w-0">
              <div className="truncate font-bold">
                {SLOT_KEYS.includes(a.slot as (typeof SLOT_KEYS)[number])
                  ? t(`adsT.slot.${a.slot}`)
                  : a.slot}
                <span className="ms-2 rounded bg-secondary px-1.5 py-0.5 text-[10px]">
                  {KIND_KEYS.includes(a.kind as (typeof KIND_KEYS)[number])
                    ? t(`adsT.kind.${a.kind}`)
                    : a.kind}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                priority: {a.priority} · freq: {a.frequency}%
                {a.starts_at && t("adsT.starts", { d: new Date(a.starts_at).toLocaleDateString() })}
                {a.ends_at && t("adsT.ends", { d: new Date(a.ends_at).toLocaleDateString() })}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => toggle(a)}>
                {a.enabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setEditing(a)}>
                {t("common.edit")}
              </Button>
              <Button size="sm" variant="outline" onClick={() => del(a.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        {(q.data?.length ?? 0) === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("adsT.empty")}
          </div>
        )}
      </div>
      {editing && (
        <AdForm
          initial={editing === "new" ? null : editing}
          onClose={() => {
            setEditing(null);
            qc.invalidateQueries({ queryKey: ["ads-admin"] });
          }}
        />
      )}
    </div>
  );
}

function AdForm({ initial, onClose }: { initial: AdRow | null; onClose: () => void }) {
  const t = useT();
  const [f, setF] = useState({
    id: initial?.id,
    slot: initial?.slot ?? "home_top",
    kind: initial?.kind ?? "html",
    enabled: initial?.enabled ?? true,
    script_html: initial?.script_html ?? "",
    image_url: initial?.image_url ?? "",
    link_url: initial?.link_url ?? "",
    starts_at: initial?.starts_at ?? "",
    ends_at: initial?.ends_at ?? "",
    priority: initial?.priority ?? 0,
    frequency: initial?.frequency ?? 100,
    label_ar: (initial as unknown as { label_ar?: string })?.label_ar ?? "",
  });
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try {
      await upsertAd({
        ...f,
        script_html: f.script_html || null,
        image_url: f.image_url || null,
        link_url: f.link_url || null,
        starts_at: f.starts_at || null,
        ends_at: f.ends_at || null,
      });
      toast.success(t("adsT.saved"));
      onClose();
    } catch (e: unknown) {
      showError(e);
    }
    setBusy(false);
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl border border-border/60 bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-xl font-black">
          {initial ? t("adsT.editTitle") : t("adsT.newTitle")}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("adsT.field.slot")}</label>
            <select
              value={f.slot}
              onChange={(e) => setF({ ...f, slot: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            >
              {SLOT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`adsT.slot.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("adsT.field.kind")}</label>
            <select
              value={f.kind}
              onChange={(e) => setF({ ...f, kind: e.target.value })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            >
              {KIND_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`adsT.kind.${k}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold">{t("adsT.field.html")}</label>
            <textarea
              value={f.script_html}
              onChange={(e) => setF({ ...f, script_html: e.target.value })}
              rows={5}
              className="w-full resize-none rounded-md border border-input bg-background/60 p-2 font-mono text-xs"
            />
          </div>
          {(f.kind === "image" || f.kind === "native") && (
            <>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  {t("adsT.field.imageUrl")}
                </label>
                <input
                  value={f.image_url}
                  onChange={(e) => setF({ ...f, image_url: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold">
                  {t("adsT.field.linkUrl")}
                </label>
                <input
                  value={f.link_url}
                  onChange={(e) => setF({ ...f, link_url: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
                />
              </div>
            </>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("adsT.field.starts")}</label>
            <input
              type="datetime-local"
              value={f.starts_at ? new Date(f.starts_at).toISOString().slice(0, 16) : ""}
              onChange={(e) =>
                setF({
                  ...f,
                  starts_at: e.target.value ? new Date(e.target.value).toISOString() : "",
                })
              }
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("adsT.field.ends")}</label>
            <input
              type="datetime-local"
              value={f.ends_at ? new Date(f.ends_at).toISOString().slice(0, 16) : ""}
              onChange={(e) =>
                setF({
                  ...f,
                  ends_at: e.target.value ? new Date(e.target.value).toISOString() : "",
                })
              }
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("adsT.field.priority")}</label>
            <input
              type="number"
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: parseInt(e.target.value) || 0 })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold">{t("adsT.field.frequency")}</label>
            <input
              type="number"
              min={1}
              max={100}
              value={f.frequency}
              onChange={(e) => setF({ ...f, frequency: parseInt(e.target.value) || 100 })}
              className="h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 md:col-span-2">
            <input
              type="checkbox"
              checked={f.enabled}
              onChange={(e) => setF({ ...f, enabled: e.target.checked })}
            />
            <span className="text-sm">{t("adsT.field.enabled")}</span>
          </label>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button disabled={busy} onClick={save}>
            {t("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
