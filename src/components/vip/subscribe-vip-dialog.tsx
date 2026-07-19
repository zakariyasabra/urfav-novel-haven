import { useState } from "react";
import { X, Upload, ImageIcon, ChevronRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { showError } from "@/lib/errors";
import {
  submitVipSubscription,
  uploadPaymentProof,
  type PaymentMethod,
} from "@/lib/admin-api";
import { MethodDetails } from "@/components/wallet/buy-coins-dialog";
import { useT, usePreferences } from "@/i18n/provider";

interface Props {
  planId: string;
  planName: string;
  methods: PaymentMethod[];
  onClose: () => void;
  onSubmitted?: () => void;
}

export function SubscribeVipDialog({ planId, planName, methods, onClose, onSubmitted }: Props) {
  const t = useT();
  const { lang } = usePreferences();
  const [selected, setSelected] = useState<PaymentMethod | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofRef, setProofRef] = useState("");
  const [proofNote, setProofNote] = useState("");
  const [busy, setBusy] = useState(false);

  const label = (m: PaymentMethod) => (lang === "en" ? m.name_en || m.name_ar : m.name_ar);

  async function submit() {
    if (!selected) return;
    if (!proofFile) return toast.error(t("bc.err.proof"));
    setBusy(true);
    try {
      const proof_image_url = await uploadPaymentProof(proofFile);
      await submitVipSubscription({
        plan_id: planId,
        payment_method_id: selected.id,
        proof_image_url,
        proof_ref: proofRef.trim() || undefined,
        proof_note: proofNote.trim() || undefined,
      });
      toast.success(t("vip.proofSubmitted"));
      onSubmitted?.();
      onClose();
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-auto rounded-2xl border border-border/60 bg-surface p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {selected && (
              <button
                onClick={() => setSelected(null)}
                aria-label="back"
                className="rounded-md p-1 hover:bg-surface/70"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h3 className="truncate text-lg font-black">
              {selected
                ? label(selected)
                : t("vip.pickMethod") + " — " + planName}
            </h3>
          </div>
          <button onClick={onClose} aria-label="close">
            <X className="h-5 w-5" />
          </button>
        </div>

        {!selected ? (
          <div className="grid gap-2">
            {methods.length === 0 && (
              <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-xs text-muted-foreground">
                {t("vip.footerNoMethods")}
              </div>
            )}
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelected(m)}
                className="flex items-center justify-between rounded-lg border border-border/40 bg-background/40 p-3 text-start text-sm transition-colors hover:border-primary"
              >
                <div>
                  <div className="font-bold">{label(m)}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.currency}
                    {m.code === "usdt" && m.config?.network ? ` · ${m.config.network}` : ""}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 opacity-60 rtl:rotate-180" />
              </button>
            ))}
          </div>
        ) : (
          <>
            <MethodDetails m={selected} />

            <label className="mb-1 mt-4 block text-xs font-bold">{t("bc.proof")}</label>
            <label className="mb-3 flex cursor-pointer items-center justify-between gap-2 rounded-md border border-dashed border-border/60 bg-background/40 p-3 text-sm hover:border-primary">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                {proofFile ? (
                  <ImageIcon className="h-4 w-4 text-primary" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                <span className="truncate">{proofFile ? proofFile.name : t("bc.proof.ph")}</span>
              </span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
              />
            </label>

            <label className="mb-1 block text-xs font-bold">
              {t("bc.ref")} <span className="text-muted-foreground">({t("common.optional") || "اختياري"})</span>
            </label>
            <input
              value={proofRef}
              onChange={(e) => setProofRef(e.target.value)}
              placeholder={t("bc.ref.ph")}
              dir="ltr"
              className="mb-3 h-10 w-full rounded-md border border-input bg-background/60 px-3 text-sm"
            />

            <label className="mb-1 block text-xs font-bold">
              {t("bc.note")} <span className="text-muted-foreground">({t("common.optional") || "اختياري"})</span>
            </label>
            <textarea
              value={proofNote}
              onChange={(e) => setProofNote(e.target.value)}
              className="mb-4 min-h-16 w-full rounded-md border border-input bg-background/60 p-2 text-sm"
            />

            <Button disabled={busy || !proofFile} onClick={submit} className="w-full">
              {busy ? t("bc.submitting") : t("vip.iPaid")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
